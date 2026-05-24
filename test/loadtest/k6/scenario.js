/**
 * scenario.js — main load test
 *
 * Each VU:
 *   1. Logs in once (setup-per-VU pattern in default fn, gated by an init flag).
 *   2. Repeatedly hits the 5 heaviest read endpoints in a realistic order:
 *        a) GET /api/userprofile        — load on app start
 *        b) GET /api/workspace          — list workspaces
 *        c) GET /api/workspace/{id}/tree/v2 — workspace tree (heavy)
 *        d) GET /api/task               — task list
 *        e) GET /api/k                  — knowledge bases
 *
 * Token is cached per-VU; refresh is NOT exercised (test runs < access TTL).
 *
 * Thresholds fail the run if p95 > 2s or error rate > 5%.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import exec from "k6/execution";
import { BASE_URL, VUS, RAMP_UP, STEADY, RAMP_DOWN, emailForVU, PASSWORD } from "./config.js";
import { login, authHeaders } from "./auth.js";

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
        "http_req_duration{name:POST /api/auth/login}":            ["p(95)<3000"],
        "http_req_duration{name:GET /api/userprofile}":            ["p(95)<2000"],
        "http_req_duration{name:GET /api/workspace}":              ["p(95)<2000"],
        "http_req_duration{name:GET /api/workspace/{id}/tree/v2}": ["p(95)<3000"],
        "http_req_duration{name:GET /api/task}":                   ["p(95)<2000"],
        "http_req_duration{name:GET /api/k}":                      ["p(95)<2000"],
        "http_req_failed{name:POST /api/auth/login}":              ["rate<0.05"],
        "http_req_failed{name:GET /api/userprofile}":              ["rate<0.05"],
        "http_req_failed{name:GET /api/workspace}":                ["rate<0.05"],
        "http_req_failed{name:GET /api/workspace/{id}/tree/v2}":   ["rate<0.05"],
        "http_req_failed{name:GET /api/task}":                     ["rate<0.05"],
        "http_req_failed{name:GET /api/k}":                        ["rate<0.05"],
    },
    summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const treeLatency = new Trend("ws_tree_latency", true);
const loginErrors = new Rate("login_errors");

function logIfFail(label, res) {
    if (res.status < 200 || res.status >= 400) {
        const body = (res.body || "").toString().slice(0, 200);
        console.error(`[${label}] status=${res.status} error_code=${res.error_code} duration=${Math.round(res.timings.duration)}ms body=${body}`);
    }
}

const session = {};

function getSession() {
    if (session.token) return session;
    const email = emailForVU(exec.vu.idInTest);
    const r = login(email, PASSWORD);
    if (!r) {
        loginErrors.add(1);
        return null;
    }
    loginErrors.add(0);
    session.token = r.token;
    session.userId = r.userId;
    session.email = email;
    return session;
}

export default function runScenario() {
    const s = getSession();
    if (!s) {
        sleep(1);
        return;
    }
    const headers = authHeaders(s.token);

    const profileRes = http.get(`${BASE_URL}/api/userprofile`, {
        headers,
        tags: { name: "GET /api/userprofile" },
    });
    check(profileRes, { "profile 200": (r) => r.status === 200 });
    logIfFail("GET /api/userprofile", profileRes);
    sleep(0.2);

    const wsRes = http.get(`${BASE_URL}/api/workspace?statusCode=active&deletedAt=null`, {
        headers,
        tags: { name: "GET /api/workspace" },
    });
    check(wsRes, { "ws-list 200": (r) => r.status === 200 });
    logIfFail("GET /api/workspace", wsRes);

    let firstWsId = null;
    try {
        const wsBody = wsRes.json();
        const list = Array.isArray(wsBody) ? wsBody : wsBody?.data || wsBody?.object || [];
        firstWsId = list?.[0]?.id ?? list?.[0]?.workspaceId ?? null;
    } catch { /* ignore */ }
    sleep(0.3);

    if (firstWsId) {
        const treeRes = http.get(`${BASE_URL}/api/workspace/${firstWsId}/tree/v2`, {
            headers,
            tags: { name: "GET /api/workspace/{id}/tree/v2" },
        });
        check(treeRes, { "ws-tree 200": (r) => r.status === 200 });
        logIfFail("GET /api/workspace/tree", treeRes);
        treeLatency.add(treeRes.timings.duration);
        sleep(0.5);
    }

    const taskRes = http.get(
        `${BASE_URL}/api/task?status=open,in_progress,background_progress,paused&priority=low,medium,high`,
        {
            headers,
            tags: { name: "GET /api/task" },
        }
    );
    check(taskRes, { "tasks 200": (r) => r.status === 200 });
    logIfFail("GET /api/task", taskRes);
    sleep(0.3);

    const kRes = http.get(`${BASE_URL}/api/k?statusCode=active&deletedAt=null`, {
        headers,
        tags: { name: "GET /api/k" },
    });
    check(kRes, { "k-list 200": (r) => r.status === 200 });
    logIfFail("GET /api/k", kRes);

    sleep(1 + Math.random());
}

export function handleSummary(data) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    return {
        [`results/summary-${ts}.json`]: JSON.stringify(data, null, 2),
        stdout: textSummary(data),
    };
}

function textSummary(data) {
    const m = data.metrics;
    const fmt = (v) => (v == null ? "n/a" : Math.round(v));
    const lines = [
        "",
        "=== SuperApp Load Test ===",
        `VUs (max):           ${data.state?.testRunDurationMs ? "see ramp config" : "n/a"}`,
        `Duration:            ${Math.round((data.state?.testRunDurationMs || 0) / 1000)}s`,
        `Iterations:          ${m.iterations?.values?.count ?? 0}`,
        `Requests:            ${m.http_reqs?.values?.count ?? 0}`,
        `Req rate:            ${fmt(m.http_reqs?.values?.rate)}/s`,
        `Failed rate:         ${(m.http_req_failed?.values?.rate * 100).toFixed(2)}%`,
        `Login errors:        ${(m.login_errors?.values?.rate * 100).toFixed(2)}%`,
        "",
        "Latency (ms):",
        `  avg:   ${fmt(m.http_req_duration?.values?.avg)}`,
        `  p(90): ${fmt(m.http_req_duration?.values?.["p(90)"])}`,
        `  p(95): ${fmt(m.http_req_duration?.values?.["p(95)"])}`,
        `  p(99): ${fmt(m.http_req_duration?.values?.["p(99)"])}`,
        `  max:   ${fmt(m.http_req_duration?.values?.max)}`,
        "",
    ];
    return lines.join("\n");
}
