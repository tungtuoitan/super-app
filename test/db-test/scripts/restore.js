/**
 * scripts/restore.js
 *
 * RESTORE SuperApp-test from .bak. Kicks all connections first.
 *
 * IMPORTANT: if BE is running and pointed at SuperApp-test, restore will kill
 * its EF connections. Restart BE after restoring for clean pool state.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "loadtest", ".env") });
const sql = require("mssql");

const TEST_DB     = process.env.TEST_DB_NAME       || "SuperApp-test";
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

    console.log(`Restoring ${TEST_DB} <- ${BACKUP_PATH}`);
    const pool = await sql.connect(cfg);

    const exists = await pool.request()
        .input("name", sql.NVarChar(128), TEST_DB)
        .query(`SELECT name FROM sys.databases WHERE name = @name`);

    const t0 = Date.now();

    if (exists.recordset.length) {
        console.log(`  Forcing ${TEST_DB} into SINGLE_USER (kicks active connections)...`);
        await pool.request().query(`
            ALTER DATABASE [${TEST_DB}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
        `);
    }

    console.log(`  RESTORE DATABASE WITH REPLACE...`);
    await pool.request().query(`
        RESTORE DATABASE [${TEST_DB}]
        FROM DISK = N'${BACKUP_PATH.replace(/'/g, "''")}'
        WITH REPLACE, RECOVERY, STATS = 10
    `);

    console.log(`  Setting MULTI_USER...`);
    await pool.request().query(`ALTER DATABASE [${TEST_DB}] SET MULTI_USER`);

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done in ${dt}s. ${TEST_DB} restored.`);
    console.log(`(If BE was running against ${TEST_DB}, restart 'dotnet run' for a clean pool.)`);

    await pool.close();
}

main().catch((err) => { console.error("Restore failed:", err.message); process.exit(1); });
