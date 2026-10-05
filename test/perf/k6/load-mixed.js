/**
 * **Fullpath:** /test/perf/k6/load-mixed.js
 *
 * Load test TRỘN đọc/ghi project-task-comment trên BE perf (DB SuperApp-perf). Mỗi VU = 1 user
 * perf+NNNN riêng (VU 1..HEAVY_USERS rơi vào user "nặng" ~3200 task) -> không VU nào ghi đè data
 * của VU khác. Task tạo ra trong lúc chạy tự xoá ở lượt sau; data còn sót -> db/04-restore.
 *
 * Tỉ lệ thao tác mỗi lượt (gần với dùng thật — đọc nhiều, ghi ít):
 *   25% list task của 1 project · 15% list task lọc status/priority (màn tổng) · 15% list project
 *   15% xem 1 task · 10% list comment · 8% patch status · 7% thêm comment · 5% tạo task (+ xoá task
 *   đã tạo lượt trước). Thêm ~10% request "sàn" không token (401) để đo phần mạng/tunnel.
 *
 * Env (-e):
 *   BASE_URL   (http://localhost:15100 — tunnel tới 127.0.0.1:5100 trên VPS, xem run-load.sh)
 *   VUS (10) · DURATION (1m) · RAMP (15s) · THINK_MS (1000, nghỉ giữa 2 thao tác; 0 = dồn tải)
 *   USERS (200, số user perf đã seed) · PERF_PASSWORD (LoadTest@123)
 *
 * Login làm 1 lần trong setup() (bcrypt nặng + rate limit 10 login/s/IP) cho min(VUS, USERS) user.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:15100';
const VUS = Number(__ENV.VUS || 10);
const USERS = Number(__ENV.USERS || 200);
const THINK_MS = Number(__ENV.THINK_MS ?? 1000);
const PASSWORD = __ENV.PERF_PASSWORD || 'LoadTest@123';

export const options = {
  setupTimeout: '5m',
  scenarios: {
    mixed: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP || '15s', target: VUS },
        { duration: __ENV.DURATION || '1m', target: VUS },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:read}': ['p(95)<800'],
    'http_req_duration{kind:write}': ['p(95)<800'],
    // k6 chỉ xuất số liệu theo tag khi có threshold trỏ tới -> threshold "luôn đúng" cho từng endpoint.
    ...Object.fromEntries([
      'GET floor (401)', 'GET /api/project', 'GET /api/task?projectIds', 'GET /api/task?status&priority', 'GET /api/task/{id}',
      'GET /api/taskcomment', 'PATCH /api/task/{id}', 'POST /api/taskcomment', 'POST /api/task', 'DELETE /api/task',
    ].flatMap((n) => [[`http_req_duration{name:${n}}`, ['max>=0']], [`http_reqs{name:${n}}`, ['count>=0']]])),
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const payloadKb = new Trend('payload_kb');

function email(i) { return `perf+${String(i).padStart(4, '0')}@test.local`; }

export function setup() {
  const n = Math.min(VUS, USERS);
  const tokens = [];
  for (let i = 1; i <= n; i++) {
    let res;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = http.post(`${BASE}/api/auth/login`, { username: email(i), password: PASSWORD }, { tags: { name: 'login(setup)' } });
      if (res.status !== 429) break;
      sleep(0.5);
    }
    const token = res.status === 200 ? res.json('user.token') : null;
    if (!token) throw new Error(`login ${email(i)} thất bại: HTTP ${res.status}`);
    tokens.push(token);
    sleep(0.12); // < 10 login/s
  }
  return { tokens };
}

// State riêng từng VU (module scope = mỗi VU 1 bản).
let me = null;

function req(method, path, name, kind, body) {
  const params = { headers: { Authorization: `Bearer ${me.token}`, 'Content-Type': 'application/json' }, tags: { name, kind } };
  const res = http.request(method, `${BASE}${path}`, body === undefined ? null : JSON.stringify(body), params);
  const ok = check(res, { [`${name} 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  if (ok && res.body) payloadKb.add(res.body.length / 1024, { name });
  return res;
}

function init(data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  me = { token, projects: [], tasks: [], created: [] };
  const projects = req('GET', '/api/project?deletedAt=null', 'GET /api/project', 'read').json('data') || [];
  me.projects = projects.map((p) => p.id);
  const tasks = req('GET', `/api/task?projectIds=${me.projects.slice(0, 5).join(',')}&deletedAt=null`, 'GET /api/task?projectIds', 'read').json('data') || [];
  me.tasks = tasks.map((t) => t.id);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function (data) {
  if (!me) init(data);
  const r = Math.random() * 100;
  const pid = pick(me.projects);
  const tid = pick(me.tasks);

  // Sàn: request không token (401) — đo độ trễ mạng + tunnel + pipeline, để trừ ra khỏi các dòng khác.
  if (Math.random() < 0.1) {
    const f = http.get(`${BASE}/api/project`, { tags: { name: 'GET floor (401)', kind: 'floor' }, responseCallback: http.expectedStatuses(401) });
    check(f, { 'floor 401': (x) => x.status === 401 });
  }

  if (r < 25) req('GET', `/api/task?projectIds=${pid}&deletedAt=null`, 'GET /api/task?projectIds', 'read');
  else if (r < 40) req('GET', '/api/task?status=open,in_progress,background_progress,paused&priority=low,medium,high', 'GET /api/task?status&priority', 'read');
  else if (r < 55) req('GET', '/api/project?deletedAt=null', 'GET /api/project', 'read');
  else if (r < 70) req('GET', `/api/task/${tid}`, 'GET /api/task/{id}', 'read');
  else if (r < 80) req('GET', `/api/taskcomment?taskId=${tid}`, 'GET /api/taskcomment', 'read');
  else if (r < 88) req('PATCH', `/api/task/${tid}`, 'PATCH /api/task/{id}', 'write', { status: Math.random() < 0.5 ? 'open' : 'in_progress' });
  else if (r < 95) req('POST', '/api/taskcomment', 'POST /api/taskcomment', 'write', { taskId: tid, content: 'k6 load comment', type: 'comment' });
  else {
    if (me.created.length) req('DELETE', '/api/task', 'DELETE /api/task', 'write', { ids: me.created.splice(0) });
    const res = req('POST', '/api/task', 'POST /api/task', 'write', [{ id: 0, projectId: pid, title: 'k6 load task' }]);
    const id = res.status === 200 ? res.json('data.0.id') : null;
    if (id) me.created.push(id);
  }

  if (THINK_MS > 0) sleep((THINK_MS / 1000) * (0.5 + Math.random()));
}

export function handleSummary(summary) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  // perf.mjs truyền SUMMARY_PATH = runs/<id>/k6-summary.json; chạy k6 tay thì ghi vào results/.
  // Bỏ setup_data: chứa token JWT của user perf — hồ sơ run được commit vào git.
  const { setup_data: _tokens, ...clean } = summary;
  const out = { [__ENV.SUMMARY_PATH || `results/load-mixed-${ts}.json`]: JSON.stringify(clean, null, 2) };
  // Bảng ngắn theo endpoint ra stdout.
  const rows = Object.entries(summary.metrics)
    .filter(([k]) => k.startsWith('http_req_duration{name:'))
    .map(([k, v]) => `${k.slice(23, -1).padEnd(32)} med ${v.values.med.toFixed(1).padStart(7)}  p95 ${v.values['p(95)'].toFixed(1).padStart(7)}  p99 ${v.values['p(99)'].toFixed(1).padStart(7)}  max ${v.values.max.toFixed(1).padStart(8)} ms`);
  const m = summary.metrics;
  out.stdout = [
    '',
    `requests ${m.http_reqs.values.count}  (${m.http_reqs.values.rate.toFixed(1)}/s)   failed ${(m.http_req_failed.values.rate * 100).toFixed(2)}%   VUs max ${m.vus_max.values.max}`,
    `all: med ${m.http_req_duration.values.med.toFixed(1)}  p95 ${m.http_req_duration.values['p(95)'].toFixed(1)}  p99 ${m.http_req_duration.values['p(99)'].toFixed(1)} ms`,
    ...rows,
    `thresholds: ${Object.entries(m).filter(([, v]) => v.thresholds).map(([k, v]) => `${k} ${Object.values(v.thresholds).every((t) => t.ok) ? 'OK' : 'FAIL'}`).join(' · ')}`,
    '',
  ].join('\n');
  return out;
}
