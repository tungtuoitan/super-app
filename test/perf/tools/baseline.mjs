// **Fullpath:** /test/perf/tools/baseline.mjs
//
// Baseline độ trễ TỪNG endpoint (tuần tự, 1 request 1 lúc) — đo "BE + DB tự thân chậm cỡ nào",
// không phải chịu tải. Chạy NGAY TRÊN VPS (perf.mjs scp + ssh) để không cộng latency mạng.
// Node >= 18, không cần thư viện.
//
// Đo cho 2 hồ sơ user của DB SuperApp-perf (db/seed.sh):
//   normal = perf+0100 (~40 project, ~320 task)    heavy = perf+0001 (~40 project, ~3200 task)
// Endpoint ghi (tạo/sửa/comment/xoá task) tự tạo rồi tự xoá -> data sau khi chạy giữ nguyên.
//
// Env: BASE_URL (http://127.0.0.1:5100) · PERF_PASSWORD (LoadTest@123) · REPS (30) · WARMUP (3)
// Output: bảng người đọc -> stderr; JSON kết quả -> stdout.

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5100';
const PASSWORD = process.env.PERF_PASSWORD || 'LoadTest@123';
const REPS = Number(process.env.REPS || 30);
const WARMUP = Number(process.env.WARMUP || 3);
const PROFILES = [
  { name: 'normal', email: 'perf+0100@test.local' },
  { name: 'heavy', email: 'perf+0001@test.local' },
];

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = new URLSearchParams(form);
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const t0 = performance.now();
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  const ms = performance.now() - t0;
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { status: res.status, ms, bytes: Buffer.byteLength(text), json };
}

function stats(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, p50: q(50), p95: q(95), p99: q(99), max: s[s.length - 1], mean };
}

/** Đo 1 endpoint: WARMUP lần bỏ, REPS lần ghi; `make(i)` trả {method, path, opts}; `check` xác nhận response đúng. */
async function measure(label, make, check = (r) => r.status === 200 && r.json?.success !== false) {
  const samples = [];
  let bytes = 0;
  let failures = 0;
  for (let i = 0; i < WARMUP + REPS; i++) {
    const { method, path, opts } = await make(i);
    const r = await call(method, path, opts);
    if (!check(r)) { failures++; if (failures === 1) console.error(`  ! ${label}: HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 200)}`); }
    if (i >= WARMUP) { samples.push(r.ms); bytes = r.bytes; }
  }
  return { endpoint: label, ...stats(samples), bytes, failures };
}

async function login(email) {
  const r = await call('POST', '/api/auth/login', { form: { username: email, password: PASSWORD } });
  const token = r.json?.user?.token;
  if (!token) throw new Error(`login ${email} thất bại: HTTP ${r.status}`);
  return token;
}

async function runProfile(profile) {
  const token = await login(profile.email);
  const auth = (method, path, body) => ({ method, path, opts: { token, body } });

  // Chọn data mẫu: project có nhiều task nhất, task có nhiều comment.
  const projects = (await call('GET', '/api/project?deletedAt=null', { token })).json.data;
  const allTasks = (await call('GET', '/api/task?deletedAt=null', { token })).json.data;
  const byProject = new Map();
  for (const t of allTasks) byProject.set(t.projectId, (byProject.get(t.projectId) || 0) + 1);
  const pid = [...byProject.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const sampleTask = allTasks.find((t) => t.projectId === pid && t.id % 11 === 10) || allTasks.find((t) => t.projectId === pid);
  const tid = sampleTask.id;
  console.error(`\n[${profile.name}] ${profile.email}: ${projects.length} project, ${allTasks.length} task; mẫu project=${pid} (${byProject.get(pid)} task), task=${tid}`);

  const rows = [];
  const m = async (...a) => { const r = await measure(...a); rows.push(r); console.error(`  ${r.endpoint.padEnd(58)} p50 ${r.p50.toFixed(1).padStart(7)}  p95 ${r.p95.toFixed(1).padStart(7)}  max ${r.max.toFixed(1).padStart(7)} ms  ${String(r.bytes).padStart(8)} B${r.failures ? `  FAIL ${r.failures}` : ''}`); };

  await m('GET /api/project (không token, sàn pipeline)', () => ({ method: 'GET', path: '/api/project', opts: {} }), (r) => r.status === 401);
  await m('GET /api/project', () => auth('GET', '/api/project'));
  await m('GET /api/project?status=active,open&deletedAt=null', () => auth('GET', '/api/project?status=active,open&deletedAt=null'));
  await m('GET /api/project/{id}', () => auth('GET', `/api/project/${pid}`));
  await m('GET /api/task?projectIds={id}&deletedAt=null', () => auth('GET', `/api/task?projectIds=${pid}&deletedAt=null`));
  await m('GET /api/task?status=open,in_progress,...&priority=...', () => auth('GET', '/api/task?status=open,in_progress,background_progress,paused&priority=low,medium,high'));
  await m('GET /api/task (toàn bộ task của user)', () => auth('GET', '/api/task'));
  await m('GET /api/task?deletedAt=null', () => auth('GET', '/api/task?deletedAt=null'));
  await m('GET /api/task/{id}', () => auth('GET', `/api/task/${tid}`));
  await m('GET /api/task?searchText=...', () => auth('GET', `/api/task?searchText=${encodeURIComponent('việc cần làm số 7')}`));
  await m('GET /api/taskcomment?taskId={id}', () => auth('GET', `/api/taskcomment?taskId=${tid}`));

  // Ghi: tạo -> patch -> comment -> xoá vĩnh viễn (tự dọn).
  const created = [];
  await m('POST /api/task (tạo 1 task)', () => auth('POST', '/api/task', [{ id: 0, projectId: pid, title: 'perf baseline task' }]),
    (r) => { const id = r.json?.data?.[0]?.id; if (id) created.push(id); return r.status === 200 && !!id; });
  let k = 0;
  await m('PATCH /api/task/{id} (status)', () => auth('PATCH', `/api/task/${created[k++ % created.length]}`, { status: k % 2 ? 'in_progress' : 'open' }));
  k = 0;
  await m('POST /api/taskcomment (tạo comment)', () => auth('POST', '/api/taskcomment', { taskId: created[k++ % created.length], content: 'perf baseline comment', type: 'devlog' }));
  k = 0;
  await m('DELETE /api/task (xoá vĩnh viễn 1 task)', () => auth('DELETE', '/api/task', { ids: [created[k++]] }));

  return { profile: profile.name, email: profile.email, projects: projects.length, tasks: allTasks.length, sampleProjectTasks: byProject.get(pid), rows };
}

const startedAt = new Date().toISOString();
const results = [];
for (const p of PROFILES) results.push(await runProfile(p));
process.stdout.write(JSON.stringify({ startedAt, base: BASE, reps: REPS, warmup: WARMUP, results }, null, 2));
