// **Fullpath:** /test/perf/perf.mjs
//
// Điều phối 1 lần đo hiệu năng và LƯU HỒ SƠ đầy đủ vào runs/<id>/ (commit vào git) để so sánh qua
// các lần update BE/DB/server:
//   meta.json        tham số, ghi chú, commit bộ test, thử nghiệm DB đã áp, thời điểm từng pha
//   env.json         server (CPU, RAM, swap, disk, OS, .NET, SQL Server + cấu hình), BE perf (build,
//                    quota), trạng thái DB (RCSI, index pro.task, số dòng, dung lượng), client (k6, node)
//   monitor.csv      mỗi 5s: load, CPU máy/iowait, RAM trống, swap, CPU+RSS sqlservr/BE prod/BE perf,
//                    thread BE perf, độ trễ prod phía server (tools/vps-monitor.sh)
//   sql-before.json / sql-after.json   counter SQL Server cộng dồn (wait, lock, batch, IO file DB…)
//   k6-summary.json | baseline.json    kết quả thô
//   metrics.json     số đã chuẩn hoá (workload + VPS theo pha + delta SQL) — nguồn của RUNS.md/compare
//   summary.md       bản đọc nhanh
//
// Lệnh (từ test/perf/, Node >= 20; cần: be/deploy-perf-be.sh đã chạy, db/seed.sh đã seed):
//   node perf.mjs load VUS=20 DURATION=2m [THINK_MS=1000] [RAMP=20s] [--note "..."] [--apply db/experiments/x.sql]
//   node perf.mjs baseline [--reps 30] [--note "..."] [--apply ...]
//      mặc định restore DB về bản seed + restart BE perf trước khi đo (--no-restore để bỏ)
//   node perf.mjs report                      dựng lại RUNS.md từ runs/*/metrics.json
//   node perf.mjs compare <runA> <runB> [lọc]  bảng chênh lệch từng số đo (B so với A)
//
// ⚠️ VPS 2 CPU dùng chung prod — load quá 20 VU / 2 phút: hỏi Tung trước (giờ vắng).
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RUNS = path.join(ROOT, 'runs');
const HOST = 'vps-superapp';
const REMOTE = '/opt/superapp-perf';
const TUNNEL_PORT = 15100;
const GIT_SSH = 'C:/Program Files/Git/usr/bin';
const SSH = process.env.SSH_BIN || (fs.existsSync(`${GIT_SSH}/ssh.exe`) ? `${GIT_SSH}/ssh.exe` : 'ssh');
const SCP = process.env.SCP_BIN || (fs.existsSync(`${GIT_SSH}/scp.exe`) ? `${GIT_SSH}/scp.exe` : 'scp');
const K6 = process.env.K6_BIN || path.resolve(ROOT, '../loadtest/bin/k6.exe');
const PRE_POST_SECONDS = 15;

// ---------------------------------------------------------------- helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error('[perf]', ...a);
const writeJson = (file, obj) => fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const round = (x, d = 1) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

function ssh(cmd, { input, inherit } = {}) {
  const r = spawnSync(SSH, ['-o', 'BatchMode=yes', HOST, cmd], {
    input, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: inherit ? ['pipe', 'pipe', 'inherit'] : 'pipe',
  });
  if (r.status !== 0) throw new Error(`ssh "${cmd.slice(0, 80)}" exit ${r.status}: ${r.stderr || ''}`);
  return r.stdout;
}

/** Chạy file .sql trên VPS; password sa đọc tại chỗ vào SQLCMDPASSWORD (không rời VPS). */
function remoteSql(file, db = 'master') {
  const cmd = 'export SQLCMDPASSWORD=$(grep ConnectionStrings__SuperAppConnection /var/www/Timeline/.env | sed -E \'s/.*Password=([^;]*).*/\\1/\'); '
    + `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -I -b -d '${db}'`;
  return ssh(cmd, { input: fs.readFileSync(path.resolve(ROOT, file), 'utf8') });
}

const probe = (mode) => JSON.parse(ssh(`node ${REMOTE}/tools/vps-probe.mjs ${mode}`));

function uploadTools() {
  ssh(`mkdir -p ${REMOTE}/tools`);
  const files = ['tools/vps-probe.mjs', 'tools/vps-monitor.sh', 'tools/baseline.mjs'].map((f) => path.join(ROOT, f));
  const r = spawnSync(SCP, ['-q', ...files, `${HOST}:${REMOTE}/tools/`], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('scp tools thất bại');
}

async function restartPerfBe() {
  ssh('systemctl restart superapp-perf');
  for (let i = 0; i < 60; i++) {
    if (ssh("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5100/api/project || true").trim() === '401') return;
    await sleep(1000);
  }
  throw new Error('BE perf không lên sau restart');
}

function git(args, cwd = ROOT) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim(); } catch { return null; }
}

function clientEnv() {
  let k6 = null;
  try { k6 = execFileSync(K6, ['version'], { encoding: 'utf8' }).trim().split('\n')[0]; } catch { /* không có k6 */ }
  return {
    hostname: os.hostname(), platform: `${os.platform()} ${os.release()}`, cpuModel: os.cpus()[0]?.model,
    cores: os.cpus().length, memTotalMb: Math.round(os.totalmem() / 1048576), node: process.version, k6,
    testRepoCommit: git(['rev-parse', '--short', 'HEAD']), testRepoDirty: !!git(['status', '--porcelain', '--', '.']),
  };
}

function parseArgs(argv) {
  const opts = { kv: {}, apply: [], restore: true, note: '', reps: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--note') opts.note = argv[++i];
    else if (a === '--apply') opts.apply.push(argv[++i]);
    else if (a === '--no-restore') opts.restore = false;
    else if (a === '--reps') opts.reps = Number(argv[++i]);
    else if (/^[A-Z_]+=/.test(a)) opts.kv[a.slice(0, a.indexOf('='))] = a.slice(a.indexOf('=') + 1);
    else throw new Error(`Tham số lạ: ${a}`);
  }
  return opts;
}

// ---------------------------------------------------------------- tổng hợp số liệu

/** monitor.csv -> {before|during|after: {cột: {avg,min,max}}} theo mốc thời gian pha. */
export function summarizeMonitor(csvText, tStart, tEnd) {
  const [header, ...lines] = csvText.trim().split('\n').filter(Boolean);
  const cols = header.split(',');
  const phases = {};
  for (const line of lines) {
    const v = line.split(',');
    const t = Number(v[0]);
    const phase = t < tStart ? 'before' : t <= tEnd ? 'during' : 'after';
    phases[phase] ??= { samples: 0 };
    const p = phases[phase];
    p.samples++;
    cols.forEach((c, i) => {
      if (c === 'epoch') return;
      const x = Number(v[i]);
      if (Number.isNaN(x)) return;
      if (c === 'prod_code') { p.prod_errors = (p.prod_errors || 0) + (x === 401 ? 0 : 1); return; }
      p[c] ??= { sum: 0, min: Infinity, max: -Infinity };
      p[c].sum += x; p[c].min = Math.min(p[c].min, x); p[c].max = Math.max(p[c].max, x);
    });
  }
  for (const p of Object.values(phases)) {
    for (const [c, s] of Object.entries(p)) {
      if (s && typeof s === 'object') p[c] = { avg: round(s.sum / p.samples), min: s.min, max: s.max };
    }
  }
  return phases;
}

// Wait "nhàn rỗi" luôn tăng kể cả khi SQL Server không làm gì -> bỏ khỏi bảng wait top.
const BENIGN_WAITS = /^(SOS_WORK_DISPATCHER|DISPATCHER_QUEUE_SEMAPHORE|SP_SERVER_DIAGNOSTICS_SLEEP|PWAIT_EXTENSIBILITY_CLEANUP_TASK|SLEEP_.*|.*_SLEEP|CHECKPOINT_QUEUE|XE_DISPATCHER_WAIT|XE_TIMER_EVENT|SQLTRACE_.*|REQUEST_FOR_DEADLOCK_SEARCH|DIRTY_PAGE_POLL|HADR_.*|LOGMGR_QUEUE|QDS_.*|BROKER_.*|FT_IFTS.*|ONDEMAND_TASK_QUEUE|WAITFOR|CLR_.*|KSOURCE_WAKEUP|FSAGENT|PREEMPTIVE_XE_.*|PREEMPTIVE_OS_FLUSHFILEBUFFERS|PARALLEL_REDO_.*|SOS_WORKER_MIGRATION|XE_LIVE_TARGET_TVF|PVS_PREALLOCATE|MEMORY_ALLOCATION_EXT|UCS_SESSION_REGISTRATION|WAIT_XTP_.*|SNI_HTTP_ACCEPT|RESOURCE_QUEUE|SERVER_IDLE_CHECK|BROKER_TASK_STOP|VDI_CLIENT_OTHER)$/;

/** Delta 2 snapshot counter SQL Server (tools/vps-probe.mjs sql). Wait là toàn server (gồm cả prod). */
export function sqlDelta(before, after) {
  const seconds = (Date.parse(after.at) - Date.parse(before.at)) / 1000;
  const bw = new Map(before.waits.map((w) => [w.t, w]));
  const waits = after.waits.map((w) => {
    const b = bw.get(w.t) || { n: 0, ms: 0, sig: 0 };
    return { type: w.t, count: w.n - b.n, ms: w.ms - b.ms, signalMs: w.sig - b.sig };
  }).filter((w) => w.ms > 0 && !BENIGN_WAITS.test(w.type)).sort((x, y) => y.ms - x.ms);
  const sumWhere = (re) => waits.filter((w) => re.test(w.type)).reduce((a, w) => ({ count: a.count + w.count, ms: a.ms + w.ms }), { count: 0, ms: 0 });

  const bc = new Map(before.counters.map((c) => [`${c.name}|${c.inst}`, c]));
  const counters = {};
  for (const c of after.counters) {
    const b = bc.get(`${c.name}|${c.inst}`);
    const key = c.inst && c.inst !== '_Total' && !/^\s*$/.test(c.inst) && !/Buffer|Memory/.test(c.inst) ? `${c.name} [${c.inst}]` : c.name;
    // 272696576 = cộng dồn -> tốc độ /s trong run; còn lại là giá trị tức thời sau run.
    counters[key] = c.type === 272696576 && b ? round((c.v - b.v) / seconds, 2) : c.v;
  }
  const bf = new Map(before.fileIo.map((f) => [f.type, f]));
  const fileIo = Object.fromEntries(after.fileIo.map((f) => {
    const b = bf.get(f.type) || {};
    const d = (k) => f[k] - (b[k] || 0);
    return [f.type, {
      reads: d('reads'), mbRead: round(d('bytesRead') / 1048576, 2), avgReadStallMs: d('reads') ? round(d('stallReadMs') / d('reads'), 2) : 0,
      writes: d('writes'), mbWritten: round(d('bytesWritten') / 1048576, 2), avgWriteStallMs: d('writes') ? round(d('stallWriteMs') / d('writes'), 2) : 0,
    }];
  }));
  return {
    note: 'Wait/counter là toàn instance SQL Server (gồm cả prod + DB khác) trong khoảng run; fileIo chỉ SuperApp-perf.',
    seconds: round(seconds),
    lockWaits: sumWhere(/^LCK_/), pageIoLatch: sumWhere(/^PAGEIOLATCH_/), writeLog: sumWhere(/^WRITELOG$/),
    asyncNetworkIo: sumWhere(/^ASYNC_NETWORK_IO$/), cpuPressure: sumWhere(/^SOS_SCHEDULER_YIELD$/),
    waitsTop: waits.slice(0, 15), counters, fileIo,
  };
}

function trend(v) {
  return v ? { avg: round(v.avg), med: round(v.med), p90: round(v['p(90)']), p95: round(v['p(95)']), p99: round(v['p(99)']), max: round(v.max) } : null;
}

/** k6 summary -> số chuẩn hoá. */
export function k6Metrics(summary) {
  const m = summary.metrics;
  const endpoints = {};
  for (const [k, v] of Object.entries(m)) {
    const hit = /^http_req_duration\{name:(.+)\}$/.exec(k);
    if (hit) endpoints[hit[1]] = { ...trend(v.values), count: m[`http_reqs{name:${hit[1]}}`]?.values?.count ?? null };
  }
  return {
    requests: m.http_reqs?.values.count, rps: round(m.http_reqs?.values.rate, 2),
    failedRate: round((m.http_req_failed?.values.rate || 0) * 100, 3),
    iterations: m.iterations?.values.count, vusMax: m.vus_max?.values.max,
    dataReceivedMb: round((m.data_received?.values.count || 0) / 1048576, 2), dataSentMb: round((m.data_sent?.values.count || 0) / 1048576, 2),
    duration: trend(m.http_req_duration?.values), waiting: trend(m.http_req_waiting?.values), receiving: trend(m.http_req_receiving?.values),
    read: trend(m['http_req_duration{kind:read}']?.values), write: trend(m['http_req_duration{kind:write}']?.values),
    thresholdsOk: Object.values(m).every((v) => !v.thresholds || Object.values(v.thresholds).every((t) => t.ok)),
    endpoints,
  };
}

/** baseline.json -> số chuẩn hoá. */
export function baselineMetrics(b) {
  return {
    reps: b.reps, warmup: b.warmup,
    profiles: Object.fromEntries(b.results.map((p) => [p.profile, {
      email: p.email, projects: p.projects, tasks: p.tasks, sampleProjectTasks: p.sampleProjectTasks,
      endpoints: Object.fromEntries(p.rows.map((r) => [r.endpoint, {
        p50: round(r.p50), p95: round(r.p95), p99: round(r.p99), max: round(r.max), mean: round(r.mean), bytes: r.bytes, failures: r.failures,
      }])),
    }])),
  };
}

// ---------------------------------------------------------------- run

async function run(kind, opts) {
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const id = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}-${kind}`;
  const dir = path.join(RUNS, id);
  fs.mkdirSync(dir, { recursive: true });
  log(`run ${id}`);

  uploadTools();
  if (ssh('systemctl is-active superapp-perf || true').trim() !== 'active') throw new Error('BE perf chưa chạy — be/deploy-perf-be.sh');
  if (opts.restore) {
    log('restore SuperApp-perf về bản seed'); remoteSql('db/04-restore-perf-db.sql');
  }
  for (const f of opts.apply) { log(`áp ${f}`); remoteSql(f); }
  if (opts.restore || opts.apply.length) { log('restart BE perf'); await restartPerfBe(); }

  const meta = {
    id, kind, note: opts.note, startedAt: ts.toISOString(), params: kind === 'load' ? opts.kv : { REPS: opts.reps },
    restoredDb: opts.restore, appliedExperiments: opts.apply,
  };
  writeJson(path.join(dir, 'env.json'), { ...probe('env'), client: clientEnv() });
  const sqlBefore = probe('sql');
  writeJson(path.join(dir, 'sql-before.json'), sqlBefore);

  const monitorOut = fs.createWriteStream(path.join(dir, 'monitor.csv'));
  const monitor = spawn(SSH, ['-o', 'BatchMode=yes', HOST, `bash ${REMOTE}/tools/vps-monitor.sh`], { stdio: ['ignore', 'pipe', 'ignore'] });
  monitor.stdout.pipe(monitorOut);
  log(`đo nền ${PRE_POST_SECONDS}s trước khi chạy`); await sleep(PRE_POST_SECONDS * 1000);
  meta.workloadStart = Math.floor(Date.now() / 1000);

  let tunnel;
  let exitCode = 0;
  try {
    if (kind === 'load') {
      tunnel = spawn(SSH, ['-N', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-L', `${TUNNEL_PORT}:127.0.0.1:5100`, HOST], { stdio: 'ignore' });
      for (let i = 0; ; i++) {
        try { if ((await fetch(`http://localhost:${TUNNEL_PORT}/api/project`)).status === 401) break; } catch { /* chưa lên */ }
        if (i > 40) throw new Error(`tunnel :${TUNNEL_PORT} không lên (cổng đang bận?)`);
        await sleep(500);
      }
      const args = ['run', '--quiet', ...Object.entries(opts.kv).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
        '-e', `BASE_URL=http://localhost:${TUNNEL_PORT}`, '-e', `SUMMARY_PATH=${path.join(dir, 'k6-summary.json')}`, 'k6/load-mixed.js'];
      exitCode = spawnSync(K6, args, { cwd: ROOT, stdio: 'inherit' }).status ?? 1;
    } else {
      const out = ssh(`REPS=${opts.reps} node ${REMOTE}/tools/baseline.mjs`, { inherit: true });
      fs.writeFileSync(path.join(dir, 'baseline.json'), out);
    }
  } finally {
    tunnel?.kill();
    meta.workloadEnd = Math.floor(Date.now() / 1000);
    writeJson(path.join(dir, 'sql-after.json'), probe('sql'));
    log(`đo nền ${PRE_POST_SECONDS}s sau khi chạy`); await sleep(PRE_POST_SECONDS * 1000);
    monitor.kill();
    await new Promise((r) => monitorOut.end(r));
    meta.finishedAt = new Date().toISOString();
    meta.k6ExitCode = kind === 'load' ? exitCode : undefined;
    writeJson(path.join(dir, 'meta.json'), meta);
  }

  buildMetrics(dir);
  writeReport();
  console.log(fs.readFileSync(path.join(dir, 'summary.md'), 'utf8'));
  log(`đã lưu runs/${id}/ — so sánh: node perf.mjs compare <run cũ> ${id}`);
  return exitCode;
}

/** Từ file thô trong runs/<id>/ dựng metrics.json + summary.md (chạy lại được bất cứ lúc nào). */
export function buildMetrics(dir) {
  const meta = readJson(path.join(dir, 'meta.json'));
  const env = readJson(path.join(dir, 'env.json'));
  const f = (n) => path.join(dir, n);
  const metrics = {
    id: meta.id, kind: meta.kind, note: meta.note, startedAt: meta.startedAt, params: meta.params,
    beBuild: env.perfBe?.build, beQuota: beQuota(env.perfBe?.unit), db: { rcsi: env.db?.rcsi, taskIndexes: env.db?.taskIndexes?.map((i) => `${i.name}${i.filter ? ' (filtered)' : ''}`), tasks: env.db?.tasks },
    appliedExperiments: meta.appliedExperiments,
    server: { memAvailableMbAtStart: env.server?.memAvailableMb, swapUsedMbAtStart: env.server ? env.server.swapTotalMb - env.server.swapFreeMb : null, loadAvgAtStart: env.server?.loadAvg?.[0] },
    workload: fs.existsSync(f('k6-summary.json')) ? k6Metrics(readJson(f('k6-summary.json')))
      : fs.existsSync(f('baseline.json')) ? baselineMetrics(readJson(f('baseline.json'))) : null,
    vps: fs.existsSync(f('monitor.csv')) && meta.workloadStart ? summarizeMonitor(fs.readFileSync(f('monitor.csv'), 'utf8'), meta.workloadStart, meta.workloadEnd) : null,
    sql: fs.existsSync(f('sql-before.json')) && fs.existsSync(f('sql-after.json')) ? sqlDelta(readJson(f('sql-before.json')), readJson(f('sql-after.json'))) : null,
    backfilled: meta.backfilled || undefined,
  };
  writeJson(f('metrics.json'), metrics);
  fs.writeFileSync(f('summary.md'), summaryMd(metrics, env));
  return metrics;
}

/** Quota systemd -> dạng đọc được: CPUQuotaPerSecUSec "1s" -> "100% CPU", MemoryMax bytes -> MB. */
function beQuota(unit = {}) {
  const q = unit.CPUQuotaPerSecUSec;
  const sec = /^([\d.]+)(ms|s)$/.exec(q || '');
  const cpu = sec ? `${Math.round((Number(sec[1]) / (sec[2] === 'ms' ? 1000 : 1)) * 100)}% CPU` : `${q || '?'} CPU`;
  const mem = /^\d+$/.test(unit.MemoryMax || '') ? `${Math.round(Number(unit.MemoryMax) / 1048576)} MB RAM` : `${unit.MemoryMax || '?'} RAM`;
  return `${cpu}, ${mem}`;
}

function summaryMd(m, env) {
  const L = [`# Run ${m.id}`, '', `- Loại: **${m.kind}** · ghi chú: ${m.note || '—'}${m.backfilled ? ' · *(nhập lại từ kết quả cũ — thiếu delta SQL/một phần env)*' : ''}`,
    `- Tham số: \`${JSON.stringify(m.params)}\` · BE build \`${m.beBuild}\` · thử nghiệm DB: ${m.appliedExperiments?.length ? m.appliedExperiments.join(', ') : 'không'}`,
    `- DB: RCSI ${m.db.rcsi ? 'ON' : 'OFF'} · ${m.db.tasks} task · index pro.task: ${m.db.taskIndexes?.join(', ')}`,
    `- Server: ${env.server?.cpuModel} × ${env.server?.cores} core · RAM ${env.server?.memTotalMb} MB (trống lúc bắt đầu ${m.server.memAvailableMbAtStart} MB, swap dùng ${m.server.swapUsedMbAtStart} MB, load ${m.server.loadAvgAtStart}) · SQL Server ${env.sqlServer?.version} (max memory ${env.sqlServer?.maxServerMemoryMb} MB) · BE perf quota ${beQuota(env.perfBe?.unit)} · SQL target memory ${env.sqlServer?.targetMemoryMb} MB`,
    `- Client: ${env.client?.hostname} · ${env.client?.k6 || 'không k6'} · node ${env.client?.node} · commit bộ test ${env.client?.testRepoCommit}${env.client?.testRepoDirty ? ' (dirty)' : ''}`, ''];
  const w = m.workload;
  if (m.kind === 'load' && w) {
    L.push('## Load', '', `${w.requests} request · **${w.rps} req/s** · lỗi ${w.failedRate}% · ${w.iterations} lượt · VU max ${w.vusMax} · nhận ${w.dataReceivedMb} MB · thresholds ${w.thresholdsOk ? 'OK' : 'FAIL'}`, '',
      '| | med | p95 | p99 | max |', '|---|---|---|---|---|');
    for (const [n, t] of [['tất cả', w.duration], ['chờ server (waiting)', w.waiting], ['tải response (receiving)', w.receiving], ['đọc', w.read], ['ghi', w.write], ...Object.entries(w.endpoints)]) {
      if (t) L.push(`| ${n}${t.count != null ? ` (${t.count})` : ''} | ${t.med} | ${t.p95} | ${t.p99} | ${t.max} |`);
    }
    L.push('');
  } else if (w) {
    L.push('## Baseline (tuần tự, chạy trên VPS — p50 / p95 ms)', '');
    const names = Object.keys(Object.values(w.profiles)[0].endpoints);
    const profs = Object.keys(w.profiles);
    L.push(`| Endpoint | ${profs.map((p) => `${p} (${w.profiles[p].tasks} task)`).join(' | ')} | bytes ${profs.at(-1)} |`, `|---|${profs.map(() => '---').join('|')}|---|`);
    for (const n of names) L.push(`| ${n} | ${profs.map((p) => { const e = w.profiles[p].endpoints[n]; return e ? `${e.p50} / ${e.p95}` : '—'; }).join(' | ')} | ${w.profiles[profs.at(-1)].endpoints[n]?.bytes ?? ''} |`);
    L.push('');
  }
  if (m.vps) {
    L.push('## VPS theo pha (avg / max; CPU process: 100 = 1 core; host: 100 = cả máy)', '',
      '| Pha | mẫu | load1 | host CPU | iowait | RAM trống MB (min) | swap MB (max) | SQL CPU | BE prod CPU | BE perf CPU | RSS SQL / perf MB (max) | thread perf (max) | prod ms (avg/max) | prod lỗi |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const ph of ['before', 'during', 'after']) {
      const p = m.vps[ph]; if (!p) continue;
      const a = (c) => (p[c] ? `${p[c].avg} / ${p[c].max}` : '—');
      L.push(`| ${ph} | ${p.samples} | ${a('load1')} | ${a('host_cpu')} | ${a('iowait')} | ${p.mem_avail_mb?.min ?? '—'} | ${p.swap_used_mb?.max ?? '—'} | ${a('cpu_sql')} | ${a('cpu_prod_be')} | ${a('cpu_perf_be')} | ${p.rss_sql_mb?.max ?? '—'} / ${p.rss_perf_be_mb?.max ?? '—'} | ${p.threads_perf_be?.max ?? '—'} | ${a('prod_ms')} | ${p.prod_errors ?? 0} |`);
    }
    L.push('');
  }
  if (m.sql) {
    const s = m.sql;
    L.push(`## SQL Server trong run (${s.seconds}s, toàn instance)`, '',
      `- Chờ khoá LCK_*: **${s.lockWaits.count} lần, ${s.lockWaits.ms} ms** · PAGEIOLATCH ${s.pageIoLatch.ms} ms · WRITELOG ${s.writeLog.ms} ms · ASYNC_NETWORK_IO ${s.asyncNetworkIo.ms} ms · SOS_SCHEDULER_YIELD ${s.cpuPressure.ms} ms`,
      `- Counter: ${Object.entries(s.counters).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
      `- IO file SuperApp-perf: ${Object.entries(s.fileIo).map(([k, v]) => `${k}: ${v.reads} read (${v.mbRead} MB, ${v.avgReadStallMs} ms/read), ${v.writes} write (${v.mbWritten} MB, ${v.avgWriteStallMs} ms/write)`).join(' · ')}`,
      '', '| Wait top | lần | ms |', '|---|---|---|', ...s.waitsTop.map((x) => `| ${x.type} | ${x.count} | ${x.ms} |`), '');
  }
  return `${L.join('\n')}\n`;
}

// ---------------------------------------------------------------- report / compare

function allMetrics() {
  if (!fs.existsSync(RUNS)) return [];
  return fs.readdirSync(RUNS).sort().map((d) => path.join(RUNS, d, 'metrics.json')).filter(fs.existsSync).map(readJson);
}

export function writeReport() {
  const ms = allMetrics();
  const cell = (x) => (x == null ? '—' : x);
  const exp = (m) => (m.appliedExperiments?.length ? m.appliedExperiments.map((f) => path.basename(f, '.sql')).join(', ') : '—');
  const vps = (m, c, k = 'avg') => cell(m.vps?.during?.[c]?.[k]);
  const L = ['# Lịch sử các lần đo', '', '**Fullpath:** /test/perf/RUNS.md', '',
    '> SINH TỰ ĐỘNG bởi `node perf.mjs` (mỗi run / `report`) — không sửa tay. Chi tiết từng run: `runs/<id>/summary.md`.',
    '> So sánh 2 run: `node perf.mjs compare <A> <B>`. Phân tích + đề xuất: [PERF-HISTORY.md](PERF-HISTORY.md).', '',
    '## Load', '',
    '| Run | Ghi chú | BE | RCSI | Thử nghiệm DB | Tham số | req/s | lỗi % | med | p95 | p99 | ghi p99 | host CPU avg/max | perf BE CPU avg/max | SQL CPU avg | RAM trống min | swap max | prod ms avg/max | chờ khoá ms |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const m of ms.filter((x) => x.kind === 'load')) {
    const w = m.workload || {};
    L.push(`| [${m.id}](runs/${m.id}/summary.md) | ${m.note || ''} | ${m.beBuild} | ${m.db.rcsi ? 'ON' : 'OFF'} | ${exp(m)} | ${Object.entries(m.params).map(([k, v]) => `${k}=${v}`).join(' ')} | ${cell(w.rps)} | ${cell(w.failedRate)} | ${cell(w.duration?.med)} | ${cell(w.duration?.p95)} | ${cell(w.duration?.p99)} | ${cell(w.write?.p99)} | ${vps(m, 'host_cpu')} / ${vps(m, 'host_cpu', 'max')} | ${vps(m, 'cpu_perf_be')} / ${vps(m, 'cpu_perf_be', 'max')} | ${vps(m, 'cpu_sql')} | ${vps(m, 'mem_avail_mb', 'min')} | ${vps(m, 'swap_used_mb', 'max')} | ${vps(m, 'prod_ms')} / ${vps(m, 'prod_ms', 'max')} | ${cell(m.sql?.lockWaits?.ms)} |`);
  }
  const keyEps = ['GET /api/task (toàn bộ task của user)', 'GET /api/task?status=open,in_progress,...&priority=...', 'GET /api/task?projectIds={id}&deletedAt=null', 'PATCH /api/task/{id} (status)', 'DELETE /api/task (xoá vĩnh viễn 1 task)'];
  L.push('', '## Baseline (p50 ms — normal / heavy)', '',
    `| Run | Ghi chú | BE | RCSI | Thử nghiệm DB | ${keyEps.join(' | ')} | host CPU avg/max | chờ khoá ms |`, `|---|---|---|---|---|${keyEps.map(() => '---').join('|')}|---|---|`);
  for (const m of ms.filter((x) => x.kind === 'baseline')) {
    const p = m.workload?.profiles || {};
    L.push(`| [${m.id}](runs/${m.id}/summary.md) | ${m.note || ''} | ${m.beBuild} | ${m.db.rcsi ? 'ON' : 'OFF'} | ${exp(m)} | ${keyEps.map((e) => `${cell(p.normal?.endpoints[e]?.p50)} / ${cell(p.heavy?.endpoints[e]?.p50)}`).join(' | ')} | ${vps(m, 'host_cpu')} / ${vps(m, 'host_cpu', 'max')} | ${cell(m.sql?.lockWaits?.ms)} |`);
  }
  fs.writeFileSync(path.join(ROOT, 'RUNS.md'), `${L.join('\n')}\n`);
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out[key] = v;
    else if (typeof v === 'boolean') out[key] = v ? 1 : 0;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
  }
  return out;
}

function compare(a, b, filter) {
  const load = (id) => readJson(path.join(RUNS, id, 'metrics.json'));
  const A = load(a), B = load(b);
  const fa = flatten({ db: A.db, workload: A.workload, vps: A.vps, sql: A.sql && { lockWaits: A.sql.lockWaits, counters: A.sql.counters, fileIo: A.sql.fileIo } });
  const fb = flatten({ db: B.db, workload: B.workload, vps: B.vps, sql: B.sql && { lockWaits: B.sql.lockWaits, counters: B.sql.counters, fileIo: B.sql.fileIo } });
  console.log(`A = ${a} (${A.note || ''}; BE ${A.beBuild}, RCSI ${A.db.rcsi ? 'ON' : 'OFF'}, ${JSON.stringify(A.params)})`);
  console.log(`B = ${b} (${B.note || ''}; BE ${B.beBuild}, RCSI ${B.db.rcsi ? 'ON' : 'OFF'}, ${JSON.stringify(B.params)})\n`);
  const keys = Object.keys(fa).filter((k) => k in fb && (!filter || k.includes(filter)));
  const w = Math.min(90, Math.max(...keys.map((k) => k.length)));
  for (const k of keys) {
    const x = fa[k], y = fb[k];
    const pct = x === 0 ? (y === 0 ? '' : '   new') : `${y - x >= 0 ? '+' : ''}${((100 * (y - x)) / Math.abs(x)).toFixed(1)}%`;
    console.log(`${k.padEnd(w)}  ${String(round(x, 2)).padStart(12)}  ${String(round(y, 2)).padStart(12)}  ${pct.padStart(9)}`);
  }
}

// ---------------------------------------------------------------- main

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    if (cmd === 'load' || cmd === 'baseline') process.exitCode = await run(cmd, parseArgs(rest));
    else if (cmd === 'report') { for (const d of fs.readdirSync(RUNS)) if (fs.existsSync(path.join(RUNS, d, 'meta.json'))) buildMetrics(path.join(RUNS, d)); writeReport(); log('đã dựng lại RUNS.md'); }
    else if (cmd === 'compare') compare(rest[0], rest[1], rest[2]);
    else { console.error('Dùng: node perf.mjs load|baseline|report|compare … (xem đầu file)'); process.exitCode = 2; }
  } catch (e) { console.error(`[perf] LỖI: ${e.message}`); process.exitCode = 1; }
}
