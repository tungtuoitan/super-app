require("dotenv").config({ path: require("path").join(__dirname, "..", "loadtest", ".env") });
const sql = require("mssql");
(async () => {
    const cfg = {
        server: process.env.DB_SERVER, port: 1433,
        database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false }, requestTimeout: 60000,
    };
    const pool = await sql.connect(cfg);
    const r = await pool.request().query(`
        SELECT
            (SELECT COUNT(*) FROM urm.users WHERE email LIKE 'loadtest+%@test.local' AND deleted_at IS NULL) AS users,
            (SELECT COUNT(*) FROM ws.workspaces w JOIN urm.users u ON u.id=w.user_id WHERE u.email LIKE 'loadtest+%@test.local' AND w.deleted_at IS NULL) AS ws_total,
            (SELECT COUNT(DISTINCT w.user_id) FROM ws.workspaces w JOIN urm.users u ON u.id=w.user_id WHERE u.email LIKE 'loadtest+%@test.local' AND w.deleted_at IS NULL) AS users_with_ws,
            (SELECT COUNT(*) FROM ws.workspace_items i JOIN ws.workspaces w ON w.id=i.workspace_id JOIN urm.users u ON u.id=w.user_id WHERE u.email LIKE 'loadtest+%@test.local' AND i.deleted_at IS NULL) AS items_total
    `);
    console.log(r.recordset[0]);
    await pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
