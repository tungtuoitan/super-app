/**
 * scenario-spike.js — 1000 users SLAM the app at once
 *
 * Use case: simulates "1000 users open the app at the same instant"
 * (e.g. after a meeting starts, after a deploy, after a notification fan-out).
 * Differs from scenario-tree.js by an aggressive 30-second ramp instead of 1 minute.
 *
 * Each VU:
 *   1. Hit GET /api/workspace once (warm-up, capture wsIds).
 *   2. Loop GET /api/workspace/{id}/tree/v2 on a random ws.
 *
 * This isolates server cold-start under burst load — connection pool warm-up,
 * thread pool spin-up, JWT validation contention, EF compile-time.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";
import { SharedArray } from "k6/data";

const BASE_URL  = __ENV.BASE_URL  || "http://localhost:5000";
const VUS       = parseInt(__ENV.VUS       || "1000", 10);
const RAMP_UP   = __ENV.RAMP_UP   || "30s";
const STEADY    = __ENV.STEADY    || "1m";
const RAMP_DOWN = __ENV.RAMP_DOWN || "15s";

const tokens = new SharedArray("tokens", () =>
    JSON.parse(open("../results/tokens.json"))
);

export const options = {
    scenarios: {
        spike: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: RAMP_UP,   target: VUS },   // burst
                { duration: STEADY,    target: VUS },   // sustain
                { duration: RAMP_DOWN, target: 0 },
            ],
            gracefulRampDown: "30s",
        },
    },
    thresholds: {
        http_req_failed: ["rate<0.10"], // looser for spike
        "http_req_duration{name:GET /api/workspace/{id}/tree/v2}": ["p(95)<5000"],
    },
    summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const treeBytes = new Trend("tree_bytes");

const session = {};
function getSession() {
    const vu = exec.vu.idInTest;
    if (session[vu]) return session[vu];
    session[vu] = { token: tokens[(vu - 1) % tokens.length], wsIds: null };
    return session[vu];
}

export default function runSpike() {
    const s = getSession();
    if (!s.token) { sleep(1); return; }
    const headers = { Authorization: `Bearer ${s.token}` };

    if (!s.wsIds) {
        const wsRes = http.get(`${BASE_URL}/api/workspace?statusCode=active&deletedAt=null`, {
            headers,
            tags: { name: "GET /api/workspace" },
        });
        if (!check(wsRes, { "ws-list 200": (r) => r.status === 200 })) {
            sleep(1);
            return;
        }
        try {
            const body = wsRes.json();
            const list = Array.isArray(body) ? body : body?.data || body?.object || [];
            s.wsIds = (list || []).map((w) => w.id ?? w.workspaceId).filter(Boolean);
        } catch { /* ignore */ }
        if (!s.wsIds || s.wsIds.length === 0) { sleep(1); return; }
    }

    const wsId = s.wsIds[Math.floor(Math.random() * s.wsIds.length)];
    const treeRes = http.get(`${BASE_URL}/api/workspace/${wsId}/tree/v2`, {
        headers,
        tags: { name: "GET /api/workspace/{id}/tree/v2" },
    });
    const ok = check(treeRes, { "tree 200": (r) => r.status === 200 });
    if (!ok) {
        const body = (treeRes.body || "").toString().slice(0, 200);
        console.error(`[tree] vu=${exec.vu.idInTest} ws=${wsId} status=${treeRes.status} body=${body}`);
    } else {
        treeBytes.add((treeRes.body || "").length);
    }

    sleep(0.5 + Math.random());
}

export function handleSummary(data) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    return {
        [`results/summary-spike-${ts}.json`]: JSON.stringify(data, null, 2),
        stdout: textSummary(data),
    };
}

function textSummary(data) {
    const m = data.metrics;
    const fmt = (v) => (v == null ? "n/a" : Math.round(v));
    const tree = m["http_req_duration{name:GET /api/workspace/{id}/tree/v2}"]?.values || {};
    const treeFail = m["http_req_failed{name:GET /api/workspace/{id}/tree/v2}"]?.values || {};
    return [
        "",
        "=== Spike Test (1000 VUs in 30s) ===",
        `Duration:           ${Math.round((data.state?.testRunDurationMs || 0) / 1000)}s`,
        `Total requests:     ${m.http_reqs?.values?.count ?? 0} @ ${fmt(m.http_reqs?.values?.rate)}/s`,
        `Iterations:         ${m.iterations?.values?.count ?? 0}`,
        `Overall fail:       ${(m.http_req_failed?.values?.rate * 100).toFixed(2)}%`,
        "",
        `tree/v2 latency p95: ${fmt(tree["p(95)"])}ms  (avg ${fmt(tree.avg)}, p99 ${fmt(tree["p(99)"])}, max ${fmt(tree.max)})`,
        `tree/v2 fail rate:   ${treeFail.rate != null ? (treeFail.rate*100).toFixed(2)+"%" : "n/a"}`,
        `tree/v2 avg bytes:   ${fmt(m.tree_bytes?.values?.avg)}`,
        "",
    ].join("\n");
}
