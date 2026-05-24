/**
 * scenario-spike-sticky-fast.js — same as scenario-spike-sticky.js but hits /tree/v2/fast
 *
 * Used to compare performance of /tree/v2 vs /tree/v2/fast under sticky workload.
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
                { duration: RAMP_UP,   target: VUS },
                { duration: STEADY,    target: VUS },
                { duration: RAMP_DOWN, target: 0 },
            ],
            gracefulRampDown: "30s",
        },
    },
    thresholds: {
        http_req_failed: ["rate<0.10"],
        "http_req_duration{name:GET /api/workspace/{id}/tree/v2/fast}": ["p(95)<5000"],
    },
    summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const treeBytes = new Trend("tree_bytes");

const session = {};
function getSession() {
    const vu = exec.vu.idInTest;
    if (session[vu]) return session[vu];
    session[vu] = { token: tokens[(vu - 1) % tokens.length], stickyWsId: null };
    return session[vu];
}

export default function runStickyFast() {
    const s = getSession();
    if (!s.token) { sleep(1); return; }
    const headers = { Authorization: `Bearer ${s.token}` };

    if (!s.stickyWsId) {
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
            const wsIds = (list || []).map((w) => w.id ?? w.workspaceId).filter(Boolean);
            if (wsIds.length) s.stickyWsId = wsIds[Math.floor(Math.random() * wsIds.length)];
        } catch { /* ignore */ }
        if (!s.stickyWsId) { sleep(1); return; }
    }

    const treeRes = http.get(`${BASE_URL}/api/workspace/${s.stickyWsId}/tree/v2/fast`, {
        headers,
        tags: { name: "GET /api/workspace/{id}/tree/v2/fast" },
    });
    const ok = check(treeRes, { "tree 200": (r) => r.status === 200 });
    if (!ok) {
        const body = (treeRes.body || "").toString().slice(0, 200);
        console.error(`[tree-fast] vu=${exec.vu.idInTest} ws=${s.stickyWsId} status=${treeRes.status} body=${body}`);
    } else {
        treeBytes.add((treeRes.body || "").length);
    }

    sleep(0.5 + Math.random());
}

export function handleSummary(data) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    return {
        [`results/summary-spike-sticky-fast-${ts}.json`]: JSON.stringify(data, null, 2),
        stdout: textSummary(data),
    };
}

function textSummary(data) {
    const m = data.metrics;
    const fmt = (v) => (v == null ? "n/a" : Math.round(v));
    const tree = m["http_req_duration{name:GET /api/workspace/{id}/tree/v2/fast}"]?.values || {};
    return [
        "",
        "=== Spike STICKY FAST (/tree/v2/fast endpoint) ===",
        `Duration:           ${Math.round((data.state?.testRunDurationMs || 0) / 1000)}s`,
        `Total requests:     ${m.http_reqs?.values?.count ?? 0} @ ${fmt(m.http_reqs?.values?.rate)}/s`,
        `Iterations:         ${m.iterations?.values?.count ?? 0}`,
        `Overall fail:       ${(m.http_req_failed?.values?.rate * 100).toFixed(2)}%`,
        "",
        `tree-fast p95: ${fmt(tree["p(95)"])}ms  (avg ${fmt(tree.avg)}, p99 ${fmt(tree["p(99)"])}, max ${fmt(tree.max)})`,
        `tree-fast avg bytes: ${fmt(m.tree_bytes?.values?.avg)}`,
        "",
    ].join("\n");
}
