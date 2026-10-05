// **Fullpath:** /test/perf/tools/vps-probe.mjs
//
// Chạy TRÊN VPS (perf.mjs scp + ssh). In 1 JSON ra stdout:
//   node vps-probe.mjs env   -> môi trường server + cấu hình BE perf + trạng thái DB SuperApp-perf
//   node vps-probe.mjs sql   -> snapshot counter SQL Server (cộng dồn) để perf.mjs tính delta trước/sau run
// Password `sa` đọc từ /var/www/Timeline/.env vào env của sqlcmd con — không in, không rời VPS.
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';

const SQLCMD = '/opt/mssql-tools18/bin/sqlcmd';
const DB = 'SuperApp-perf';
const pw = /Password=([^;]*)/.exec(readFileSync('/var/www/Timeline/.env', 'utf8').match(/^ConnectionStrings__SuperAppConnection=.*$/m)[0])[1];

/** Chạy 1 câu SELECT ... FOR JSON PATH, trả object/array đã parse. */
function sqlJson(query, db = 'master') {
  const out = execFileSync(SQLCMD, ['-S', 'localhost', '-U', 'sa', '-C', '-b', '-y', '0', '-d', db, '-Q', `SET NOCOUNT ON; ${query}`],
    { env: { ...process.env, SQLCMDPASSWORD: pw }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // Bỏ dòng tiêu đề cột + gạch; FOR JSON dài bị SQL Server tách nhiều dòng -> nối lại nguyên văn (không trim).
  const lines = out.replace(/\r/g, '').split('\n');
  const start = lines.findIndex((l) => l.startsWith('[') || l.startsWith('{'));
  const text = start < 0 ? '' : lines.slice(start).join('');
  return text ? JSON.parse(text) : null;
}
const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return null; } };
const unitProp = (unit, props) => Object.fromEntries((sh(`systemctl show ${unit} -p ${props.join(',')}`) || '')
  .split('\n').filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

function env() {
  const mem = Object.fromEntries(readFileSync('/proc/meminfo', 'utf8').split('\n').filter(Boolean)
    .map((l) => { const [k, v] = l.split(':'); return [k, parseInt(v, 10)]; }));
  const disk = sh("df -BM --output=size,avail / | tail -1")?.split(/\s+/).filter(Boolean);
  return {
    server: {
      hostname: os.hostname(),
      cpuModel: os.cpus()[0]?.model, cores: os.cpus().length,
      memTotalMb: Math.round(mem.MemTotal / 1024), memAvailableMb: Math.round(mem.MemAvailable / 1024),
      swapTotalMb: Math.round((mem.SwapTotal || 0) / 1024), swapFreeMb: Math.round((mem.SwapFree || 0) / 1024),
      os: sh('. /etc/os-release && echo "$PRETTY_NAME"'), kernel: os.release(),
      loadAvg: os.loadavg(), uptimeDays: Math.round(os.uptime() / 86400),
      diskRootMb: disk ? { size: parseInt(disk[0], 10), avail: parseInt(disk[1], 10) } : null,
      dotnetRuntimes: sh('dotnet --list-runtimes')?.split('\n'),
      nodeVersion: process.version,
    },
    perfBe: {
      build: sh('cat /opt/superapp-perf/app/PERF_BUILD_SHA'),
      unit: unitProp('superapp-perf', ['ActiveState', 'MainPID', 'CPUQuotaPerSecUSec', 'MemoryMax', 'User', 'ActiveEnterTimestamp']),
      listen: '127.0.0.1:5100',
    },
    prodBe: {
      unit: unitProp('superapp-api', ['ActiveState', 'MainPID', 'ActiveEnterTimestamp']),
      deployedBuildTime: sh('stat -c %y /var/www/Timeline/publish/SuperAppAPI.dll'),
    },
    sqlServer: sqlJson(`SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(50)) AS version,
        CAST(SERVERPROPERTY('Edition') AS nvarchar(100)) AS edition,
        (SELECT cpu_count FROM sys.dm_os_sys_info) AS cpuCount,
        (SELECT committed_target_kb / 1024 FROM sys.dm_os_sys_info) AS targetMemoryMb,
        (SELECT physical_memory_in_use_kb / 1024 FROM sys.dm_os_process_memory) AS memoryInUseMb,
        (SELECT CAST(value_in_use AS int) FROM sys.configurations WHERE name = 'max server memory (MB)') AS maxServerMemoryMb,
        (SELECT CAST(value_in_use AS int) FROM sys.configurations WHERE name = 'max degree of parallelism') AS maxdop,
        (SELECT CAST(value_in_use AS int) FROM sys.configurations WHERE name = 'cost threshold for parallelism') AS costThreshold
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER`),
    db: sqlJson(`SELECT DB_NAME() AS name, d.is_read_committed_snapshot_on AS rcsi, d.snapshot_isolation_state_desc AS snapshotIsolation,
        d.recovery_model_desc AS recovery, d.compatibility_level AS compatLevel,
        (SELECT CAST(SUM(size) * 8 / 1024 AS int) FROM sys.database_files) AS sizeMb,
        (SELECT COUNT(*) FROM urm.users) AS users, (SELECT COUNT(*) FROM pro.project) AS projects,
        (SELECT COUNT(*) FROM pro.task) AS tasks, (SELECT COUNT(*) FROM pro.task_comment) AS comments,
        (SELECT i.name, i.type_desc AS type, i.filter_definition AS filter,
                STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS keys
         FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
         JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
         WHERE i.object_id = OBJECT_ID('pro.task') GROUP BY i.name, i.type_desc, i.filter_definition FOR JSON PATH) AS taskIndexes
      FROM sys.databases d WHERE d.name = DB_NAME() FOR JSON PATH, WITHOUT_ARRAY_WRAPPER`, DB),
    prodDbRcsi: sqlJson(`SELECT is_read_committed_snapshot_on AS rcsi FROM sys.databases WHERE name = 'SuperApp-pro' FOR JSON PATH, WITHOUT_ARRAY_WRAPPER`),
  };
}

function sql() {
  return {
    at: new Date().toISOString(),
    waits: sqlJson(`SELECT wait_type AS t, waiting_tasks_count AS n, wait_time_ms AS ms, signal_wait_time_ms AS sig
      FROM sys.dm_os_wait_stats WHERE wait_time_ms > 0 FOR JSON PATH`),
    counters: sqlJson(`SELECT RTRIM(counter_name) AS name, RTRIM(instance_name) AS inst, cntr_value AS v, cntr_type AS type
      FROM sys.dm_os_performance_counters
      WHERE (counter_name IN ('Batch Requests/sec', 'SQL Compilations/sec', 'SQL Re-Compilations/sec', 'Page life expectancy',
                              'Lazy writes/sec', 'Page reads/sec', 'Page writes/sec', 'Full Scans/sec', 'Index Searches/sec',
                              'Version Store Size (KB)', 'User Connections', 'Processes blocked', 'Memory Grants Pending'))
         OR (counter_name IN ('Lock Waits/sec', 'Lock Wait Time (ms)', 'Lock Timeouts/sec', 'Number of Deadlocks/sec',
                              'Lock Requests/sec') AND instance_name = '_Total')
         OR (counter_name IN ('Transactions/sec', 'Log Bytes Flushed/sec', 'Log Flushes/sec') AND instance_name = '${DB}')
      FOR JSON PATH`),
    fileIo: sqlJson(`SELECT f.type_desc AS type, s.num_of_reads AS reads, s.num_of_bytes_read AS bytesRead, s.io_stall_read_ms AS stallReadMs,
        s.num_of_writes AS writes, s.num_of_bytes_written AS bytesWritten, s.io_stall_write_ms AS stallWriteMs
      FROM sys.dm_io_virtual_file_stats(DB_ID('${DB}'), NULL) s JOIN sys.master_files f ON f.database_id = s.database_id AND f.file_id = s.file_id
      FOR JSON PATH`),
    perfDbSessions: sqlJson(`SELECT COUNT(*) AS sessions FROM sys.dm_exec_sessions WHERE database_id = DB_ID('${DB}') FOR JSON PATH, WITHOUT_ARRAY_WRAPPER`),
  };
}

const mode = process.argv[2];
process.stdout.write(JSON.stringify(mode === 'env' ? env() : mode === 'sql' ? sql() : { error: 'mode: env | sql' }));
