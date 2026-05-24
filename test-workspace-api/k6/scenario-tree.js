/**
 * scenario-tree.js — load test for /api/workspace/{id}/tree/v2
 *
 * Reads pre-warmed tokens from ../loadtest/results/tokens.json. Each VU:
 *   1. Lists workspaces once (warm-up, captures all workspace IDs).
 *   2. Each iteration picks a random workspace and hits tree/v2.
 *
 * Picking randomly means we exercise small (1 item) and large (180 items)
 * workspaces in proportion — closer to real user behavior than always
 * hitting the first one.
 *
 * Run after `clone-data.js` so loadtest users actually have workspaces.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";
import { SharedArray } from "k6/data";

const BASE_URL  = __ENV.BASE_URL  || "http://localhost:5000";
const VUS       = parseInt(__ENV.VUS       || "200", 10);
const RAMP_UP   = __ENV.RAMP_UP   || "30s";
const STEADY    = __ENV.STEADY    || "1m";
const RAMP_DOWN = __ENV.RAMP_DOWN || "15s";

const tokens = new SharedArray("tokens", () =>
    JSON.parse(open("../results/tokens.json"))
);

export const options = {
    scenarios: {
        ramp: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: RAMP_UP,   target: VUS },
                { duration: STEADY,    target: VUS },
                { duration: RAMP_DOWN, target: 0 },
            ],
            gracefulRampDown: "30s",
        },
    },
    thresholds: {
        http_req_failed: ["rate<0.05"],
        "http_req_duration{name:GET /api/workspace/{id}/tree/v2}": ["p(95)<3000"],
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

export default function runTree() {
    const s = getSession();
    if (!s.token) { sleep(1); return; }
    const headers = { Authorization: `Bearer ${s.token}` };

    if (!s.wsIds) {
        const wsRes = http.get(`${BASE_URL}/api/workspace?statusCode=active&deletedAt=null`, {
            headers,
            tags: { name: "GET /api/workspace" },
        });
        if (!check(wsRes, { "ws-list 200": (r) => r.status === 200 })) {
            console.error(`[ws-list] vu=${exec.vu.idInTest} status=${wsRes.status}`);
            sleep(1);
            return;
        }
        try {
            const body = wsRes.json();
            const list = Array.isArray(body) ? body : body?.data || body?.object || [];
            s.wsIds = (list || []).map((w) => w.id ?? w.workspaceId).filter(Boolean);
        } catch { /* ignore */ }
        if (!s.wsIds || s.wsIds.length === 0) {
            console.error(`[ws-list] vu=${exec.vu.idInTest} no workspaces returned`);
            sleep(1);
            return;
        }
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
        [`results/summary-tree-${ts}.json`]: JSON.stringify(data, null, 2),
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
        "=== Workspace Tree Load Test ===",
        `Duration:           ${Math.round((data.state?.testRunDurationMs || 0) / 1000)}s`,
        `Total requests:     ${m.http_reqs?.values?.count ?? 0} @ ${fmt(m.http_reqs?.values?.rate)}/s`,
        `Overall fail:       ${(m.http_req_failed?.values?.rate * 100).toFixed(2)}%`,
        "",
        `tree/v2 latency p95: ${fmt(tree["p(95)"])}ms  (avg ${fmt(tree.avg)}, p99 ${fmt(tree["p(99)"])}, max ${fmt(tree.max)})`,
        `tree/v2 fail rate:   ${treeFail.rate != null ? (treeFail.rate*100).toFixed(2)+"%" : "n/a"}`,
        `tree/v2 avg bytes:   ${fmt(m.tree_bytes?.values?.avg)}`,
        "",
    ].join("\n");
}
