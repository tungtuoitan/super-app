/**
 * scripts/clone-all.js
 *
 * Set-based pure-SQL clone of all user-scoped data from SuperApp-pro into
 * SuperApp-test, fanned out across every loadtest+NNNN@test.local user.
 *
 * Uses real staging tables (dbo._stage_*) instead of tempdb # tables because
 * mssql connection pooling drops temp tables between requests. Staging tables
 * are dropped at the end.
 *
 * Approach:
 *   1. Cross-DB INSERT...SELECT...CROSS JOIN target_users (set-based)
 *   2. OUTPUT into staging map tables to remember source.id -> new.id per user
 *   3. Layer order respects FKs (workspaces before items, knowledge before nodes)
 *   4. Materialized paths (PathIds, path_ids) rebuilt depth-by-depth using maps
 *
 * Skipped (loose refs, not load-test-relevant): flow_edge, flow_node_position,
 *   point_history, node_status_history, entity_hashtags.
 *
 * Idempotent: deletes any pre-existing rows for loadtest users before insert.
 *
 * Usage: node scripts/clone-all.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "loadtest", ".env") });
const sql = require("mssql");

const SOURCE_DB = process.env.PROD_DB_NAME    || "SuperApp-pro";
const TARGET_DB = process.env.TEST_DB_NAME    || "SuperApp-test";
const SOURCE_EMAIL = process.env.CLONE_SOURCE_EMAIL || "hoanhtungle@gmail.com";
const PREFIX = process.env.LOADTEST_EMAIL_PREFIX || "loadtest+";
const DOMAIN = process.env.LOADTEST_EMAIL_DOMAIN || "test.local";

function cfg(database) {
    return {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false },
        requestTimeout: 1800000, // 30 min
    };
}

async function step(pool, label, query) {
    process.stdout.write(`  ${label}... `);
    const t0 = Date.now();
    const r = await pool.request().query(query);
    const ra = Array.isArray(r.rowsAffected) ? r.rowsAffected.reduce((a, b) => a + b, 0) : 0;
    console.log(`${ra} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return r;
}

async function main() {
    const t0 = Date.now();
    console.log(`Cloning ${SOURCE_DB} -> ${TARGET_DB} for users matching ${PREFIX}%@${DOMAIN}`);
    const pool = await sql.connect(cfg(TARGET_DB));

    const srcUid = (await pool.request().query(`
        SELECT id FROM [${SOURCE_DB}].urm.users WHERE email = '${SOURCE_EMAIL}'
    `)).recordset[0]?.id;
    if (!srcUid) throw new Error(`Source user not found: ${SOURCE_EMAIL}`);
    console.log(`Source user id: ${srcUid}`);

    // ── Staging tables (permanent, dropped at end) ─────────────────────────
    await step(pool, "drop+create staging tables", `
        IF OBJECT_ID('dbo._stage_target_users') IS NOT NULL DROP TABLE dbo._stage_target_users;
        IF OBJECT_ID('dbo._stage_ws_map')       IS NOT NULL DROP TABLE dbo._stage_ws_map;
        IF OBJECT_ID('dbo._stage_k_map')        IS NOT NULL DROP TABLE dbo._stage_k_map;
        IF OBJECT_ID('dbo._stage_proj_map')     IS NOT NULL DROP TABLE dbo._stage_proj_map;
        IF OBJECT_ID('dbo._stage_wi_map')       IS NOT NULL DROP TABLE dbo._stage_wi_map;
        IF OBJECT_ID('dbo._stage_node_map')     IS NOT NULL DROP TABLE dbo._stage_node_map;
        IF OBJECT_ID('dbo._stage_task_map')     IS NOT NULL DROP TABLE dbo._stage_task_map;
        IF OBJECT_ID('dbo._stage_tc_map')       IS NOT NULL DROP TABLE dbo._stage_tc_map;

        SELECT id INTO dbo._stage_target_users
        FROM urm.users WHERE email LIKE '${PREFIX}%@${DOMAIN}' AND deleted_at IS NULL;
        CREATE INDEX IX_stu_id ON dbo._stage_target_users(id);

        CREATE TABLE dbo._stage_ws_map   (target_user_id INT, source_id INT, new_id INT, INDEX IX1(target_user_id,source_id));
        CREATE TABLE dbo._stage_k_map    (target_user_id INT, source_id INT, new_id INT, INDEX IX1(target_user_id,source_id));
        CREATE TABLE dbo._stage_proj_map (target_user_id INT, source_id INT, new_id INT, INDEX IX1(target_user_id,source_id));
        CREATE TABLE dbo._stage_wi_map   (target_user_id INT, source_id INT, new_id INT, parent_new_id INT, new_path NVARCHAR(1000), INDEX IX1(target_user_id,source_id));
        CREATE TABLE dbo._stage_node_map (target_user_id INT, source_id INT, new_id INT, parent_new_id INT, new_path NVARCHAR(1000), INDEX IX1(target_user_id,source_id));
        CREATE TABLE dbo._stage_task_map (target_user_id INT, source_id INT, new_id INT, INDEX IX1(target_user_id,source_id));
        CREATE TABLE dbo._stage_tc_map   (target_user_id INT, source_id INT, new_id INT, INDEX IX1(target_user_id,source_id));
    `);
    const tu = (await pool.request().query(`SELECT COUNT(*) c FROM dbo._stage_target_users`)).recordset[0].c;
    console.log(`Target users: ${tu}`);
    if (!tu) throw new Error(`No loadtest users in ${TARGET_DB}.`);

    console.log(`\n=== Wipe existing user-scoped data ===`);
    await step(pool, "delete pro.task_comment", `DELETE FROM pro.task_comment WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete pro.task", `
        DELETE t FROM pro.task t
        JOIN pro.project p ON p.id = t.project_id
        WHERE p.user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete pro.project", `DELETE FROM pro.project WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete k.question", `
        DELETE q FROM k.question q
        JOIN k.node n ON n.id = q.node_id
        JOIN k.knowledge kk ON kk.id = n.knowledge_id
        WHERE kk.user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete k.node", `
        DELETE n FROM k.node n
        JOIN k.knowledge kk ON kk.id = n.knowledge_id
        WHERE kk.user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete k.knowledge", `DELETE FROM k.knowledge WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete ws.workspace_items", `
        DELETE wi FROM ws.workspace_items wi
        JOIN ws.workspaces w ON w.id = wi.workspace_id
        WHERE w.user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete ws.workspaces", `DELETE FROM ws.workspaces WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete ws.folders", `DELETE FROM ws.folders WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete dbo.notes", `DELETE FROM dbo.notes WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete dbo.files", `DELETE FROM dbo.files WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete dbo.Keywords", `DELETE FROM dbo.Keywords WHERE UserId IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete dbo.hashtags", `DELETE FROM dbo.hashtags WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);
    await step(pool, "delete urm.user_profiles", `DELETE FROM urm.user_profiles WHERE user_id IN (SELECT id FROM dbo._stage_target_users)`);

    // ── LAYER 1 ────────────────────────────────────────────────────────────
    console.log(`\n=== Layer 1: user-only deps ===`);

    await step(pool, "user_profiles", `
        INSERT INTO urm.user_profiles
            (user_id, first_name, last_name, avatar_url, bio, date_of_birth, gender,
             country, city, timezone, language, created_at, updated_at, filters)
        SELECT u.id, src.first_name, src.last_name, src.avatar_url, src.bio,
               src.date_of_birth, src.gender, src.country, src.city, src.timezone,
               src.language, SYSUTCDATETIME(), NULL, src.filters
        FROM [${SOURCE_DB}].urm.user_profiles src
        CROSS JOIN dbo._stage_target_users u
        WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL`);

    await step(pool, "dbo.hashtags", `
        INSERT INTO dbo.hashtags (user_id, name, usage_count, created_at, updated_at)
        SELECT u.id, src.name, src.usage_count, SYSUTCDATETIME(), NULL
        FROM [${SOURCE_DB}].dbo.hashtags src
        CROSS JOIN dbo._stage_target_users u
        WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL`);

    await step(pool, "dbo.notes", `
        INSERT INTO dbo.notes (user_id, name, description, created_at, updated_at, status_code, color, icon)
        SELECT u.id, src.name, src.description, SYSUTCDATETIME(), NULL,
               src.status_code, src.color, src.icon
        FROM [${SOURCE_DB}].dbo.notes src
        CROSS JOIN dbo._stage_target_users u
        WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL`);

    await step(pool, "dbo.files", `
        INSERT INTO dbo.files (user_id, name, url, file_size, mime_type, extension,
                               status_code, created_at, updated_at, color, icon, google_drive_file_id)
        SELECT u.id, src.name, src.url, src.file_size, src.mime_type, src.extension,
               src.status_code, GETUTCDATE(), NULL, src.color, src.icon, src.google_drive_file_id
        FROM [${SOURCE_DB}].dbo.files src
        CROSS JOIN dbo._stage_target_users u
        WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL`);

    await step(pool, "dbo.Keywords", `
        INSERT INTO dbo.Keywords (UserId, Name, Type, TargetItemId, Link, Description, CreatedAt, UpdatedAt)
        SELECT u.id, src.Name, src.Type, src.TargetItemId,
               src.Link + N'#u' + CAST(u.id AS NVARCHAR(20)),
               src.Description, SYSUTCDATETIME(), NULL
        FROM [${SOURCE_DB}].dbo.Keywords src
        CROSS JOIN dbo._stage_target_users u
        WHERE src.UserId = ${srcUid} AND src.HardDeletedAt IS NULL`);

    await step(pool, "ws.folders", `
        INSERT INTO ws.folders (user_id, name, description, color, icon, created_at, updated_at)
        SELECT u.id, src.name, src.description, src.color, src.icon, SYSUTCDATETIME(), NULL
        FROM [${SOURCE_DB}].ws.folders src
        CROSS JOIN dbo._stage_target_users u
        WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL`);

    await step(pool, "ws.workspaces", `
        MERGE INTO ws.workspaces AS tgt
        USING (
            SELECT u.id AS target_user_id, src.id AS source_id,
                   src.name, src.description, src.status_code
            FROM [${SOURCE_DB}].ws.workspaces src
            CROSS JOIN dbo._stage_target_users u
            WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL
        ) AS s
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (user_id, name, description, status_code, created_at)
            VALUES (s.target_user_id, s.name, s.description, s.status_code, SYSUTCDATETIME())
        OUTPUT s.target_user_id, s.source_id, inserted.id INTO dbo._stage_ws_map(target_user_id, source_id, new_id);`);

    await step(pool, "k.knowledge", `
        MERGE INTO k.knowledge AS tgt
        USING (
            SELECT u.id AS target_user_id, src.id AS source_id,
                   src.name, src.description, src.status_code, src.image_base64
            FROM [${SOURCE_DB}].k.knowledge src
            CROSS JOIN dbo._stage_target_users u
            WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL
        ) AS s
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (user_id, name, description, status_code, image_base64, created_at)
            VALUES (s.target_user_id, s.name, s.description, s.status_code, s.image_base64, SYSUTCDATETIME())
        OUTPUT s.target_user_id, s.source_id, inserted.id INTO dbo._stage_k_map(target_user_id, source_id, new_id);`);

    // ── LAYER 2 ────────────────────────────────────────────────────────────
    console.log(`\n=== Layer 2 ===`);

    await step(pool, "pro.project", `
        MERGE INTO pro.project AS tgt
        USING (
            SELECT u.id AS target_user_id, src.id AS source_id,
                   src.name, src.description, src.status_code,
                   src.start_date, src.end_date, src.image,
                   wm.new_id AS new_workspace_id
            FROM [${SOURCE_DB}].pro.project src
            CROSS JOIN dbo._stage_target_users u
            LEFT JOIN dbo._stage_ws_map wm ON wm.target_user_id = u.id AND wm.source_id = src.workspace_id
            WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL
        ) AS s
        ON 1 = 0
        WHEN NOT MATCHED THEN
            INSERT (name, description, status_code, created_at, updated_at, user_id,
                    start_date, end_date, workspace_id, image)
            VALUES (s.name, s.description, s.status_code, SYSUTCDATETIME(), SYSUTCDATETIME(),
                    s.target_user_id, s.start_date, s.end_date, s.new_workspace_id, s.image)
        OUTPUT s.target_user_id, s.source_id, inserted.id INTO dbo._stage_proj_map(target_user_id, source_id, new_id);`);

    // ws.workspace_items — depth-by-depth
    const wiMaxDepth = (await pool.request().query(`
        SELECT ISNULL(MAX(PathDepth), 0) AS d
        FROM [${SOURCE_DB}].ws.workspace_items wi
        JOIN [${SOURCE_DB}].ws.workspaces w ON w.id = wi.workspace_id
        WHERE w.user_id = ${srcUid} AND wi.deleted_at IS NULL
    `)).recordset[0].d;
    console.log(`  workspace_items max depth: ${wiMaxDepth}`);

    for (let d = 0; d <= wiMaxDepth; d++) {
        await step(pool, `ws.workspace_items depth=${d}`, `
            DECLARE @inserted TABLE (target_user_id INT, source_id INT, new_id INT, parent_new_id INT);
            MERGE INTO ws.workspace_items AS tgt
            USING (
                SELECT u.id AS target_user_id, src.id AS source_id,
                       wm.new_id AS new_workspace_id,
                       pm.new_id AS new_parent_id,
                       src.entity_type, src.entity_id, src.PathDepth
                FROM [${SOURCE_DB}].ws.workspace_items src
                JOIN [${SOURCE_DB}].ws.workspaces w ON w.id = src.workspace_id
                CROSS JOIN dbo._stage_target_users u
                JOIN dbo._stage_ws_map wm ON wm.target_user_id = u.id AND wm.source_id = src.workspace_id
                LEFT JOIN dbo._stage_wi_map pm ON pm.target_user_id = u.id AND pm.source_id = src.parent_id
                WHERE w.user_id = ${srcUid} AND src.deleted_at IS NULL AND src.PathDepth = ${d}
            ) AS s
            ON 1 = 0
            WHEN NOT MATCHED THEN
                INSERT (workspace_id, parent_id, entity_type, entity_id, created_at, PathIds, PathDepth)
                VALUES (s.new_workspace_id, s.new_parent_id, s.entity_type, s.entity_id,
                        SYSUTCDATETIME(), '/', s.PathDepth)
            OUTPUT s.target_user_id, s.source_id, inserted.id, inserted.parent_id INTO @inserted;

            INSERT INTO dbo._stage_wi_map (target_user_id, source_id, new_id, parent_new_id, new_path)
            SELECT i.target_user_id, i.source_id, i.new_id, i.parent_new_id,
                   CASE WHEN i.parent_new_id IS NULL THEN '/'
                        ELSE pm.new_path + CAST(i.parent_new_id AS NVARCHAR(20)) + '/' END
            FROM @inserted i
            LEFT JOIN dbo._stage_wi_map pm ON pm.target_user_id = i.target_user_id AND pm.new_id = i.parent_new_id;

            UPDATE wi SET wi.PathIds = m.new_path
            FROM ws.workspace_items wi
            JOIN dbo._stage_wi_map m ON m.new_id = wi.id
            WHERE m.new_path IS NOT NULL AND wi.PathDepth = ${d};`);
    }

    // k.node depth-by-depth
    const nodeMaxDepth = (await pool.request().query(`
        SELECT ISNULL(MAX(n.path_depth), 0) AS d
        FROM [${SOURCE_DB}].k.node n
        JOIN [${SOURCE_DB}].k.knowledge kk ON kk.id = n.knowledge_id
        WHERE kk.user_id = ${srcUid} AND n.deleted_at IS NULL
    `)).recordset[0].d;
    console.log(`  k.node max depth: ${nodeMaxDepth}`);

    for (let d = 0; d <= nodeMaxDepth; d++) {
        await step(pool, `k.node depth=${d}`, `
            DECLARE @inserted TABLE (target_user_id INT, source_id INT, new_id INT, parent_new_id INT);
            MERGE INTO k.node AS tgt
            USING (
                SELECT u.id AS target_user_id, src.id AS source_id,
                       km.new_id AS new_knowledge_id,
                       pm.new_id AS new_parent_id,
                       src.name, src.description, src.type_code, src.icon, src.color,
                       src.ref_target_id, src.ref_target_knowledge_id, src.type, src.point,
                       src.status, src.status_code, src.path_depth
                FROM [${SOURCE_DB}].k.node src
                JOIN [${SOURCE_DB}].k.knowledge kk ON kk.id = src.knowledge_id
                CROSS JOIN dbo._stage_target_users u
                JOIN dbo._stage_k_map km ON km.target_user_id = u.id AND km.source_id = src.knowledge_id
                LEFT JOIN dbo._stage_node_map pm ON pm.target_user_id = u.id AND pm.source_id = src.parent_id
                WHERE kk.user_id = ${srcUid} AND src.deleted_at IS NULL AND src.path_depth = ${d}
            ) AS s
            ON 1 = 0
            WHEN NOT MATCHED THEN
                INSERT (knowledge_id, parent_id, created_at, path_ids, path_depth, name, description,
                        type_code, icon, color, ref_target_id, ref_target_knowledge_id, type, point,
                        status, status_code)
                VALUES (s.new_knowledge_id, s.new_parent_id, SYSUTCDATETIME(), '/', s.path_depth,
                        s.name, s.description, s.type_code, s.icon, s.color,
                        s.ref_target_id, s.ref_target_knowledge_id, s.type, s.point,
                        s.status, s.status_code)
            OUTPUT s.target_user_id, s.source_id, inserted.id, inserted.parent_id INTO @inserted;

            INSERT INTO dbo._stage_node_map (target_user_id, source_id, new_id, parent_new_id, new_path)
            SELECT i.target_user_id, i.source_id, i.new_id, i.parent_new_id,
                   CASE WHEN i.parent_new_id IS NULL THEN '/'
                        ELSE pm.new_path + CAST(i.parent_new_id AS NVARCHAR(20)) + '/' END
            FROM @inserted i
            LEFT JOIN dbo._stage_node_map pm ON pm.target_user_id = i.target_user_id AND pm.new_id = i.parent_new_id;

            UPDATE n SET n.path_ids = m.new_path
            FROM k.node n
            JOIN dbo._stage_node_map m ON m.new_id = n.id
            WHERE m.new_path IS NOT NULL AND n.path_depth = ${d};`);
    }

    // ── LAYER 3 ────────────────────────────────────────────────────────────
    console.log(`\n=== Layer 3 ===`);

    const taskMaxDepth = (await pool.request().query(`
        WITH t AS (
            SELECT id, parent_task_id, 0 AS d
            FROM [${SOURCE_DB}].pro.task
            WHERE project_id IN (SELECT id FROM [${SOURCE_DB}].pro.project WHERE user_id = ${srcUid})
              AND parent_task_id IS NULL AND deleted_at IS NULL
            UNION ALL
            SELECT c.id, c.parent_task_id, t.d + 1
            FROM [${SOURCE_DB}].pro.task c
            JOIN t ON t.id = c.parent_task_id
            WHERE c.deleted_at IS NULL
        )
        SELECT ISNULL(MAX(d), 0) AS d FROM t OPTION (MAXRECURSION 0);
    `)).recordset[0].d;
    console.log(`  pro.task max depth: ${taskMaxDepth}`);

    for (let d = 0; d <= taskMaxDepth; d++) {
        await step(pool, `pro.task depth=${d}`, `
            MERGE INTO pro.task AS tgt
            USING (
                SELECT u.id AS target_user_id, src.id AS source_id,
                       pm.new_id AS new_project_id,
                       ${d === 0 ? "CAST(NULL AS INT)" : "ptm.new_id"} AS new_parent_task_id,
                       wim.new_id AS new_folder_wi_id,
                       src.type, src.title, src.note, src.status_code, src.priority,
                       src.start_date, src.end_date, src.order_index,
                       src.task_type, src.checklist_json, src.custom_tabs_json, src.process_json
                FROM [${SOURCE_DB}].pro.task src
                JOIN [${SOURCE_DB}].pro.project p ON p.id = src.project_id
                CROSS JOIN dbo._stage_target_users u
                JOIN dbo._stage_proj_map pm ON pm.target_user_id = u.id AND pm.source_id = src.project_id
                ${d === 0 ? "" : "JOIN dbo._stage_task_map ptm ON ptm.target_user_id = u.id AND ptm.source_id = src.parent_task_id"}
                LEFT JOIN dbo._stage_wi_map wim ON wim.target_user_id = u.id AND wim.source_id = src.folder_workspace_item_id
                WHERE p.user_id = ${srcUid} AND src.deleted_at IS NULL
                  ${d === 0 ? "AND src.parent_task_id IS NULL" : "AND src.parent_task_id IN (SELECT source_id FROM dbo._stage_task_map)"}
            ) AS s
            ON 1 = 0
            WHEN NOT MATCHED THEN
                INSERT (project_id, parent_task_id, type, title, note, status_code, priority,
                        start_date, end_date, order_index, created_at, updated_at,
                        folder_workspace_item_id, task_type, checklist_json, custom_tabs_json, process_json)
                VALUES (s.new_project_id, s.new_parent_task_id, s.type, s.title, s.note,
                        s.status_code, s.priority, s.start_date, s.end_date, s.order_index,
                        SYSUTCDATETIME(), SYSUTCDATETIME(), s.new_folder_wi_id,
                        s.task_type, s.checklist_json, s.custom_tabs_json, s.process_json)
            OUTPUT s.target_user_id, s.source_id, inserted.id INTO dbo._stage_task_map(target_user_id, source_id, new_id);`);
    }

    await step(pool, "k.question", `
        INSERT INTO k.question (name, description, sort_order, created_at, updated_at,
                                 srs_interval, srs_ease_factor, srs_repetitions, srs_next_review_at,
                                 node_id, status_code)
        SELECT src.name, src.description, src.sort_order, SYSUTCDATETIME(), NULL,
               src.srs_interval, src.srs_ease_factor, src.srs_repetitions, NULL,
               nm.new_id, src.status_code
        FROM [${SOURCE_DB}].k.question src
        JOIN [${SOURCE_DB}].k.node n ON n.id = src.node_id
        JOIN [${SOURCE_DB}].k.knowledge kk ON kk.id = n.knowledge_id
        CROSS JOIN dbo._stage_target_users u
        JOIN dbo._stage_node_map nm ON nm.target_user_id = u.id AND nm.source_id = src.node_id
        WHERE kk.user_id = ${srcUid} AND src.deleted_at IS NULL`);

    // ── LAYER 4 ────────────────────────────────────────────────────────────
    console.log(`\n=== Layer 4 ===`);

    const tcDepth = (await pool.request().query(`
        WITH t AS (
            SELECT id, parent_comment_id, 0 AS d
            FROM [${SOURCE_DB}].pro.task_comment
            WHERE user_id = ${srcUid} AND parent_comment_id IS NULL AND deleted_at IS NULL
            UNION ALL
            SELECT c.id, c.parent_comment_id, t.d + 1
            FROM [${SOURCE_DB}].pro.task_comment c
            JOIN t ON t.id = c.parent_comment_id
            WHERE c.deleted_at IS NULL
        )
        SELECT ISNULL(MAX(d), 0) AS d FROM t OPTION (MAXRECURSION 0);
    `)).recordset[0].d;
    console.log(`  pro.task_comment max depth: ${tcDepth}`);

    for (let d = 0; d <= tcDepth; d++) {
        await step(pool, `pro.task_comment depth=${d}`, `
            MERGE INTO pro.task_comment AS tgt
            USING (
                SELECT u.id AS target_user_id, src.id AS source_id,
                       tm.new_id AS new_task_id,
                       ${d === 0 ? "CAST(NULL AS INT)" : "pcm.new_id"} AS new_parent,
                       src.content
                FROM [${SOURCE_DB}].pro.task_comment src
                CROSS JOIN dbo._stage_target_users u
                JOIN dbo._stage_task_map tm ON tm.target_user_id = u.id AND tm.source_id = src.task_id
                ${d === 0 ? "" : "JOIN dbo._stage_tc_map pcm ON pcm.target_user_id = u.id AND pcm.source_id = src.parent_comment_id"}
                WHERE src.user_id = ${srcUid} AND src.deleted_at IS NULL
                  ${d === 0 ? "AND src.parent_comment_id IS NULL" : "AND src.parent_comment_id IN (SELECT source_id FROM dbo._stage_tc_map)"}
            ) AS s
            ON 1 = 0
            WHEN NOT MATCHED THEN
                INSERT (task_id, parent_comment_id, content, user_id, created_at, updated_at)
                VALUES (s.new_task_id, s.new_parent, s.content, s.target_user_id,
                        SYSUTCDATETIME(), SYSUTCDATETIME())
            OUTPUT s.target_user_id, s.source_id, inserted.id INTO dbo._stage_tc_map(target_user_id, source_id, new_id);`);
    }

    // ── Verify ─────────────────────────────────────────────────────────────
    console.log(`\n=== Verify ===`);
    const verify = await pool.request().query(`
        SELECT
            (SELECT COUNT(*) FROM ws.workspaces w JOIN urm.users u ON u.id=w.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS workspaces,
            (SELECT COUNT(*) FROM ws.workspace_items wi JOIN ws.workspaces w ON w.id=wi.workspace_id JOIN urm.users u ON u.id=w.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS ws_items,
            (SELECT COUNT(*) FROM ws.folders f JOIN urm.users u ON u.id=f.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS folders,
            (SELECT COUNT(*) FROM dbo.notes n JOIN urm.users u ON u.id=n.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS notes,
            (SELECT COUNT(*) FROM dbo.files f JOIN urm.users u ON u.id=f.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS files,
            (SELECT COUNT(*) FROM dbo.Keywords k JOIN urm.users u ON u.id=k.UserId WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS keywords,
            (SELECT COUNT(*) FROM dbo.hashtags h JOIN urm.users u ON u.id=h.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS hashtags,
            (SELECT COUNT(*) FROM pro.project p JOIN urm.users u ON u.id=p.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS projects,
            (SELECT COUNT(*) FROM pro.task t JOIN pro.project p ON p.id=t.project_id JOIN urm.users u ON u.id=p.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS tasks,
            (SELECT COUNT(*) FROM pro.task_comment tc JOIN urm.users u ON u.id=tc.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS task_comments,
            (SELECT COUNT(*) FROM k.knowledge kk JOIN urm.users u ON u.id=kk.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS knowledges,
            (SELECT COUNT(*) FROM k.node n JOIN k.knowledge kk ON kk.id=n.knowledge_id JOIN urm.users u ON u.id=kk.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS k_nodes,
            (SELECT COUNT(*) FROM k.question q JOIN k.node n ON n.id=q.node_id JOIN k.knowledge kk ON kk.id=n.knowledge_id JOIN urm.users u ON u.id=kk.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS k_questions,
            (SELECT COUNT(*) FROM urm.user_profiles p JOIN urm.users u ON u.id=p.user_id WHERE u.email LIKE '${PREFIX}%@${DOMAIN}') AS user_profiles
    `);
    const v = verify.recordset[0];
    for (const [k, val] of Object.entries(v)) console.log(`  ${k.padEnd(15)} ${val.toLocaleString()}`);
    const total = Object.values(v).reduce((a, b) => a + b, 0);
    console.log(`  ${"TOTAL".padEnd(15)} ${total.toLocaleString()}`);

    // ── Drop staging tables ────────────────────────────────────────────────
    console.log();
    await step(pool, "drop staging tables", `
        DROP TABLE dbo._stage_target_users;
        DROP TABLE dbo._stage_ws_map;
        DROP TABLE dbo._stage_k_map;
        DROP TABLE dbo._stage_proj_map;
        DROP TABLE dbo._stage_wi_map;
        DROP TABLE dbo._stage_node_map;
        DROP TABLE dbo._stage_task_map;
        DROP TABLE dbo._stage_tc_map;
    `);

    await pool.close();
    console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main().catch((err) => { console.error("Clone-all failed:", err.message); console.error(err); process.exit(1); });
