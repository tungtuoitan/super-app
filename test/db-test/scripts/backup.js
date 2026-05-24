/**
 * scripts/backup.js
 *
 * BACKUP DATABASE SuperApp-test TO DISK = '<TEST_DB_BACKUP_PATH>'
 * Path is on the SQL Server host filesystem (Linux: /var/opt/mssql/data/SuperApp-test.bak).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "loadtest", ".env") });
const sql = require("mssql");

const TEST_DB    = process.env.TEST_DB_NAME       || "SuperApp-test";
const BACKUP_PATH = process.env.TEST_DB_BACKUP_PATH || "/var/opt/mssql/data/SuperApp-test.bak";

async function main() {
    const cfg = {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database: "master",
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false },
        requestTimeout: 600000,
    };

    console.log(`Backing up ${TEST_DB} -> ${BACKUP_PATH}`);
    const pool = await sql.connect(cfg);

    // Set SIMPLE recovery + shrink log first. Bulk DML in FULL recovery
    // can balloon the log to multiple GB and exhaust VPS disk before backup runs.
    console.log(`  Setting ${TEST_DB} to SIMPLE recovery + shrinking log...`);
    await pool.request().query(`ALTER DATABASE [${TEST_DB}] SET RECOVERY SIMPLE`);
    const logFile = (await pool.request().query(`
        SELECT name FROM sys.master_files
        WHERE database_id = DB_ID('${TEST_DB}') AND type_desc = 'LOG'
    `)).recordset[0]?.name;
    if (logFile) {
        await pool.request().query(`USE [${TEST_DB}]; DBCC SHRINKFILE (N'${logFile}', 100) WITH NO_INFOMSGS`);
    }

    const t0 = Date.now();
    await pool.request().query(`
        BACKUP DATABASE [${TEST_DB}]
        TO DISK = N'${BACKUP_PATH.replace(/'/g, "''")}'
        WITH INIT, FORMAT, COMPRESSION, STATS = 10, NAME = N'${TEST_DB} frozen baseline'
    `);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done in ${dt}s.`);

    await pool.close();
}

main().catch((err) => { console.error("Backup failed:", err.message); process.exit(1); });
