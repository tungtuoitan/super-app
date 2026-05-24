/**
 * cleanup-data.js
 *
 * Delete all cloned workspaces (and CASCADE workspace_items) for loadtest users.
 * Does NOT touch the loadtest users themselves — use loadtest/cleanup-users.js for that.
 *
 * Usage: node cleanup-data.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "loadtest", ".env") });
const sql = require("mssql");

const PREFIX = process.env.LOADTEST_EMAIL_PREFIX || "loadtest+";
const DOMAIN = process.env.LOADTEST_EMAIL_DOMAIN || "test.local";

async function main() {
    const cfg = {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false },
        requestTimeout: 120000,
    };

    const pattern = `${PREFIX}%@${DOMAIN}`;
    console.log(`Deleting cloned workspace data for users matching ${pattern}...`);
    const pool = await sql.connect(cfg);

    const before = await pool.request()
        .input("p", sql.NVarChar(255), pattern)
        .query(`
            SELECT COUNT(DISTINCT w.id) AS ws_count, COUNT(i.id) AS item_count
            FROM ws.workspaces w
            JOIN urm.users u ON u.id = w.user_id
            LEFT JOIN ws.workspace_items i ON i.workspace_id = w.id
            WHERE u.email LIKE @p
        `);
    console.log(`  Before: ${before.recordset[0].ws_count} ws / ${before.recordset[0].item_count} items`);

    await pool.request()
        .input("p", sql.NVarChar(255), pattern)
        .query(`
            DELETE FROM ws.workspaces
            WHERE user_id IN (SELECT id FROM urm.users WHERE email LIKE @p)
        `);

    const after = await pool.request()
        .input("p", sql.NVarChar(255), pattern)
        .query(`
            SELECT COUNT(*) AS ws_count
            FROM ws.workspaces w
            JOIN urm.users u ON u.id = w.user_id
            WHERE u.email LIKE @p
        `);
    console.log(`  After: ${after.recordset[0].ws_count} ws remaining`);

    await pool.close();
    console.log("Done.");
}

main().catch((err) => { console.error("Cleanup failed:", err); process.exit(1); });
