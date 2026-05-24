/**
 * cleanup-users.js
 *
 * Soft-deletes all loadtest users matching the configured email pattern.
 * Sets deleted_at = SYSUTCDATETIME() and is_active = 0.
 *
 * Re-run safely. To purge hard, pass --hard (deletes rows; only use in dev DB).
 *
 * Usage:
 *   npm run cleanup
 *   node cleanup-users.js --hard
 */

require("dotenv").config();
const sql = require("mssql");

function getConfig() {
    const cfg = {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false },
        requestTimeout: 120_000,
        emailPrefix: process.env.LOADTEST_EMAIL_PREFIX || "loadtest+",
        emailDomain: process.env.LOADTEST_EMAIL_DOMAIN || "test.local",
    };
    const missing = ["server", "database", "user", "password"].filter((k) => !cfg[k]);
    if (missing.length) {
        console.error(`Missing env vars: ${missing.map((k) => "DB_" + k.toUpperCase()).join(", ")}`);
        process.exit(1);
    }
    return cfg;
}

async function main() {
    const hard = process.argv.includes("--hard");
    const cfg = getConfig();
    const pattern = `${cfg.emailPrefix}%@${cfg.emailDomain}`;

    console.log(`${hard ? "HARD" : "Soft"}-deleting users matching ${pattern} on ${cfg.server}/${cfg.database} ...`);

    const pool = await sql.connect(cfg);

    const before = await pool.request()
        .input("p", sql.NVarChar(255), pattern)
        .query(`SELECT COUNT(*) AS cnt FROM [urm].[users] WHERE email LIKE @p`);
    console.log(`  Matching rows: ${before.recordset[0].cnt}`);

    const stmt = hard
        ? `DELETE FROM [urm].[users] WHERE email LIKE @p`
        : `UPDATE [urm].[users]
              SET deleted_at = SYSUTCDATETIME(), is_active = 0, updated_at = SYSUTCDATETIME()
            WHERE email LIKE @p AND deleted_at IS NULL`;

    const result = await pool.request()
        .input("p", sql.NVarChar(255), pattern)
        .query(stmt);
    console.log(`  Affected: ${result.rowsAffected[0]}`);

    await pool.close();
    console.log("Done.");
}

main().catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});
