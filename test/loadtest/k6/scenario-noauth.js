/**
 * scenario-noauth.js — capacity test WITHOUT bcrypt login tax
 *
 * Reads pre-warmed tokens from results/tokens.json (run prewarm-tokens.js first).
 * Each VU picks a token and hits the same endpoints, but skips login.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";
import { SharedArray } from "k6/data";
import { BASE_URL, VUS, RAMP_UP, STEADY, RAMP_DOWN } from "./config.js";

const tokens = new SharedArray("tokens", () => JSON.parse(open("../results/tokens.json")));

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
        http_req_failed:   ["rate<0.05"],
        http_req_duration: ["p(95)<2000"],
        "http_req_duration{name:GET /api/userprofile}": ["p(95)<2000"],
        "http_req_duration{name:GET /api/workspace}":   ["p(95)<2000"],
        "http_req_duration{name:GET /api/task}":        ["p(95)<2000"],
        "http_req_duration{name:GET /api/k}":           ["p(95)<2000"],
    },
    summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const treeLatency = new Trend("ws_tree_latency", true);

function logIfFail(label, res) {
    if (res.status < 200 || res.status >= 400) {
        const body = (res.body || "").toString().slice(0, 200);
        console.error(`[${label}] status=${res.status} error_code=${res.error_code} body=${body}`);
    }
}

const tokenCache = {};
function getToken() {
    const vu = exec.vu.idInTest;
    if (tokenCache[vu]) return tokenCache[vu];
    tokenCache[vu] = tokens[(vu - 1) % tokens.length];
    return tokenCache[vu];
}

export default function runNoAuth() {
    const token = getToken();
    if (!token) { sleep(1); return; }
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const profileRes = http.get(`${BASE_URL}/api/userprofile`, { headers, tags: { name: "GET /api/userprofile" } });
    check(profileRes, { "profile 200": (r) => r.status === 200 });
    logIfFail("GET /api/userprofile", profileRes);
    sleep(0.2);

    const wsRes = http.get(`${BASE_URL}/api/workspace?statusCode=active&deletedAt=null`, { headers, tags: { name: "GET /api/workspace" } });
    check(wsRes, { "ws-list 200": (r) => r.status === 200 });
    logIfFail("GET /api/workspace", wsRes);
    sleep(0.3);

    const taskRes = http.get(`${BASE_URL}/api/task?status=open,in_progress,background_progress,paused&priority=low,medium,high`, { headers, tags: { name: "GET /api/task" } });
    check(taskRes, { "tasks 200": (r) => r.status === 200 });
    logIfFail("GET /api/task", taskRes);
    sleep(0.3);

    const kRes = http.get(`${BASE_URL}/api/k?statusCode=active&deletedAt=null`, { headers, tags: { name: "GET /api/k" } });
    check(kRes, { "k-list 200": (r) => r.status === 200 });
    logIfFail("GET /api/k", kRes);

    sleep(1 + Math.random());
    void treeLatency;
}

export function handleSummary(data) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    return {
        [`results/summary-noauth-${ts}.json`]: JSON.stringify(data, null, 2),
        stdout: textSummary(data),
    };
}

function textSummary(data) {
    const m = data.metrics;
    const fmt = (v) => (v == null ? "n/a" : Math.round(v));
    return [
        "",
        "=== SuperApp Load Test (no-auth, prewarmed) ===",
        `Duration:    ${Math.round((data.state?.testRunDurationMs || 0) / 1000)}s`,
        `Iterations:  ${m.iterations?.values?.count ?? 0}`,
        `Requests:    ${m.http_reqs?.values?.count ?? 0} @ ${fmt(m.http_reqs?.values?.rate)}/s`,
        `Failed:      ${(m.http_req_failed?.values?.rate * 100).toFixed(2)}%`,
        "",
        `Latency p95: ${fmt(m.http_req_duration?.values?.["p(95)"])}ms`,
        `         avg ${fmt(m.http_req_duration?.values?.avg)}  p99 ${fmt(m.http_req_duration?.values?.["p(99)"])}  max ${fmt(m.http_req_duration?.values?.max)}`,
        "",
    ].join("\n");
}
