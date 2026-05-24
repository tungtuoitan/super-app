/**
 * scripts/clone-schema.js
 *
 * Create SuperApp-test as an empty schema clone of SuperApp-dev using DBCC CLONEDATABASE.
 * Drops SuperApp-test first if it exists.
 *
 * Output: empty SuperApp-test with the same tables, FKs, indexes, but no rows.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "loadtest", ".env") });
const sql = require("mssql");

const SOURCE_DB = process.env.DB_NAME || "SuperApp-dev";
const TEST_DB   = process.env.TEST_DB_NAME || "SuperApp-test";

async function main() {
    const cfg = {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database: "master",
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false },
        requestTimeout: 300000,
    };

    console.log(`Cloning schema: ${SOURCE_DB} -> ${TEST_DB}`);
    const pool = await sql.connect(cfg);

    const exists = await pool.request()
        .input("name", sql.NVarChar(128), TEST_DB)
        .query(`SELECT name FROM sys.databases WHERE name = @name`);

    if (exists.recordset.length) {
        console.log(`  Dropping existing ${TEST_DB}...`);
        await pool.request().query(`
            ALTER DATABASE [${TEST_DB}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        `);
        await pool.request().query(`DROP DATABASE [${TEST_DB}]`);
    }

    console.log(`  DBCC CLONEDATABASE...`);
    await pool.request().query(`DBCC CLONEDATABASE ([${SOURCE_DB}], [${TEST_DB}]) WITH NO_STATISTICS, NO_QUERYSTORE`);

    console.log(`  Setting ${TEST_DB} READ_WRITE + ONLINE...`);
    await pool.request().query(`ALTER DATABASE [${TEST_DB}] SET READ_WRITE`);
    await pool.request().query(`ALTER DATABASE [${TEST_DB}] SET MULTI_USER`);

    const verify = await pool.request().query(`
        SELECT COUNT(*) AS tbl_count FROM [${TEST_DB}].sys.tables
    `);
    console.log(`Done. ${TEST_DB} has ${verify.recordset[0].tbl_count} tables.`);

    await pool.close();
}

main().catch((err) => { console.error("Schema clone failed:", err.message); process.exit(1); });
