/**
 * clone-data.js
 *
 * Clone workspaces + workspace_items from SuperApp-pro (user hoanhtungle@gmail.com, id=1)
 * into SuperApp-dev for every loadtest+NNNN@test.local user.
 *
 * Why only ws + items: workspace_items.entity_id has no FK enforcement, so we leave
 * entity_id pointing back at the source user's notes/tasks/knowledge. That's enough to
 * stress /api/workspace/{id}/tree/v2 (which queries flat list of items by workspace).
 *
 * PathIds remap: the materialized path "/abc/def/" contains parent IDs separated by "/".
 * We insert items level-by-level (sorted by PathDepth), build oldId->newId map per user,
 * then rewrite PathIds on the new rows.
 *
 * Idempotent: re-running clears prior clones for loadtest users first.
 *
 * Resume mode (--resume): skips users whose ws count already matches source.
 * For users with partial clones, deletes just their data and re-clones.
 *
 * Usage: node clone-data.js [--resume]
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "loadtest", ".env") });
const sql = require("mssql");

const PROD_DB     = process.env.PROD_DB_NAME    || "SuperApp-pro";
const DEV_DB      = process.env.DB_NAME          || "SuperApp-dev";
const SOURCE_EMAIL = process.env.CLONE_SOURCE_EMAIL || "hoanhtungle@gmail.com";
const PREFIX      = process.env.LOADTEST_EMAIL_PREFIX || "loadtest+";
const DOMAIN      = process.env.LOADTEST_EMAIL_DOMAIN || "test.local";

function buildCfg(database) {
    return {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: { trustServerCertificate: true, encrypt: false },
        requestTimeout: 120000,
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };
}

async function main() {
    const resume = process.argv.includes("--resume");
    const t0 = Date.now();

    console.log(`Reading source data from ${PROD_DB} (user '${SOURCE_EMAIL}')...`);
    const prod = await new sql.ConnectionPool(buildCfg(PROD_DB)).connect();

    const userRow = await prod.request()
        .input("email", sql.NVarChar(255), SOURCE_EMAIL)
        .query("SELECT id FROM urm.users WHERE email = @email");
    if (!userRow.recordset.length) throw new Error(`Source user not found: ${SOURCE_EMAIL}`);
    const sourceUid = userRow.recordset[0].id;

    const wsRows = await prod.request()
        .input("uid", sql.Int, sourceUid)
        .query(`SELECT id, name, description, status_code
                FROM ws.workspaces
                WHERE user_id = @uid AND deleted_at IS NULL`);

    const wsIds = wsRows.recordset.map((r) => r.id);
    if (!wsIds.length) {
        console.log("Source has no workspaces — nothing to clone.");
        await prod.close();
        return;
    }

    const itemsRes = await prod.request()
        .query(`SELECT id, workspace_id, parent_id, entity_type, entity_id, PathIds, PathDepth
                FROM ws.workspace_items
                WHERE workspace_id IN (${wsIds.join(",")}) AND deleted_at IS NULL
                ORDER BY workspace_id, PathDepth, id`);
    const allItems = itemsRes.recordset;

    const itemsByWs = new Map();
    for (const it of allItems) {
        if (!itemsByWs.has(it.workspace_id)) itemsByWs.set(it.workspace_id, []);
        itemsByWs.get(it.workspace_id).push(it);
    }

    console.log(`Source: ${wsRows.recordset.length} workspaces, ${allItems.length} items`);
    await prod.close();

    console.log(`Cloning to ${DEV_DB}...`);
    const dev = await new sql.ConnectionPool(buildCfg(DEV_DB)).connect();

    const targetUsers = await dev.request()
        .input("p", sql.NVarChar(255), `${PREFIX}%@${DOMAIN}`)
        .query(`SELECT id, email FROM urm.users
                WHERE email LIKE @p AND deleted_at IS NULL ORDER BY id`);
    if (!targetUsers.recordset.length) {
        throw new Error(`No loadtest users found. Run loadtest/seed-users.js first.`);
    }
    console.log(`Targets: ${targetUsers.recordset.length} loadtest users`);

    const expectedWsCount = wsRows.recordset.length;
    let usersToProcess = targetUsers.recordset;

    if (resume) {
        const counts = await dev.request()
            .input("p", sql.NVarChar(255), `${PREFIX}%@${DOMAIN}`)
            .query(`
                SELECT u.id AS user_id, COUNT(w.id) AS ws_count
                FROM urm.users u
                LEFT JOIN ws.workspaces w ON w.user_id = u.id AND w.deleted_at IS NULL
                WHERE u.email LIKE @p AND u.deleted_at IS NULL
                GROUP BY u.id
            `);
        const wsByUser = new Map(counts.recordset.map((r) => [r.user_id, r.ws_count]));

        const partial = [];
        const todo = [];
        let skipped = 0;
        for (const u of targetUsers.recordset) {
            const have = wsByUser.get(u.id) || 0;
            if (have === expectedWsCount) { skipped++; continue; }
            if (have > 0) partial.push(u.id);
            todo.push(u);
        }
        console.log(`Resume mode: ${skipped} users complete, ${partial.length} partial (will redo), ${todo.length - partial.length} not started`);

        if (partial.length) {
            console.log(`  Clearing partial clones for ${partial.length} users...`);
            await dev.request().query(`
                DELETE FROM ws.workspaces WHERE user_id IN (${partial.join(",")})
            `);
        }
        usersToProcess = todo;
    } else {
        console.log("Clearing previous clones for loadtest users...");
        await dev.request()
            .input("p", sql.NVarChar(255), `${PREFIX}%@${DOMAIN}`)
            .query(`
                DELETE FROM ws.workspaces
                WHERE user_id IN (SELECT id FROM urm.users WHERE email LIKE @p);
            `);
    }

    if (!usersToProcess.length) {
        console.log("Nothing to do.");
        await dev.close();
        return;
    }

    const wsItemMaxDepth = Math.max(0, ...allItems.map((i) => i.PathDepth));

    let userIdx = 0;
    for (const user of usersToProcess) {
        userIdx++;

        for (const w of wsRows.recordset) {
            const ins = await dev.request()
                .input("uid",  sql.Int,           user.id)
                .input("name", sql.NVarChar(255), w.name)
                .input("desc", sql.NVarChar(1000), w.description)
                .input("sc",   sql.NVarChar(50),  w.status_code)
                .query(`INSERT INTO ws.workspaces (user_id, name, description, status_code, created_at)
                        OUTPUT INSERTED.id
                        VALUES (@uid, @name, @desc, @sc, SYSUTCDATETIME())`);
            const newWsId = ins.recordset[0].id;

            const items = itemsByWs.get(w.id) || [];
            const idMap   = new Map();
            const pathMap = new Map();

            for (let depth = 0; depth <= wsItemMaxDepth; depth++) {
                const layer = items.filter((i) => i.PathDepth === depth);
                if (!layer.length) continue;

                const tbl = new sql.Table("ws.workspace_items");
                tbl.create = false;
                tbl.columns.add("workspace_id", sql.Int,            { nullable: false });
                tbl.columns.add("parent_id",    sql.Int,            { nullable: true  });
                tbl.columns.add("entity_type",  sql.TinyInt,        { nullable: false });
                tbl.columns.add("entity_id",    sql.Int,            { nullable: false });
                tbl.columns.add("PathIds",      sql.NVarChar(1000), { nullable: false });
                tbl.columns.add("PathDepth",    sql.Int,            { nullable: false });

                for (const it of layer) {
                    const newParent = it.parent_id == null ? null : idMap.get(it.parent_id);
                    tbl.rows.add(newWsId, newParent, it.entity_type, it.entity_id, "/", it.PathDepth);
                }

                await dev.request().bulk(tbl);

                const inserted = await dev.request()
                    .input("wsid",  sql.Int, newWsId)
                    .input("depth", sql.Int, depth)
                    .query(`SELECT id FROM ws.workspace_items
                            WHERE workspace_id = @wsid AND PathDepth = @depth
                            ORDER BY id`);
                const newIds = inserted.recordset.map((r) => r.id);

                const updates = [];
                for (let i = 0; i < layer.length; i++) {
                    const oldIt = layer[i];
                    const newId = newIds[i];
                    idMap.set(oldIt.id, newId);
                    const parentPath = oldIt.parent_id == null ? "/" : pathMap.get(oldIt.parent_id);
                    const newPath = oldIt.parent_id == null
                        ? "/"
                        : parentPath + idMap.get(oldIt.parent_id) + "/";
                    pathMap.set(oldIt.id, newPath);
                    if (newPath !== "/") updates.push({ id: newId, path: newPath });
                }

                if (updates.length) {
                    const valuesSql = updates
                        .map((u) => `(${u.id}, N'${u.path.replace(/'/g, "''")}')`)
                        .join(",");
                    await dev.request().query(`
                        UPDATE wi SET wi.PathIds = src.p
                        FROM ws.workspace_items wi
                        INNER JOIN (VALUES ${valuesSql}) AS src(id, p) ON src.id = wi.id
                    `);
                }
            }
        }

        if (userIdx % 25 === 0 || userIdx === usersToProcess.length) {
            const pct = ((userIdx / usersToProcess.length) * 100).toFixed(1);
            const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
            process.stdout.write(`\r  cloned for ${userIdx}/${usersToProcess.length} users (${pct}%, ${elapsed}s)`);
        }
    }
    console.log();

    const verify = await dev.request()
        .input("p", sql.NVarChar(255), `${PREFIX}%@${DOMAIN}`)
        .query(`
            SELECT COUNT(DISTINCT w.id) AS ws_count, COUNT(i.id) AS item_count
            FROM ws.workspaces w
            JOIN urm.users u ON u.id = w.user_id
            LEFT JOIN ws.workspace_items i ON i.workspace_id = w.id AND i.deleted_at IS NULL
            WHERE u.email LIKE @p AND w.deleted_at IS NULL
        `);
    const v = verify.recordset[0];

    await dev.close();
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done in ${dt}s. ${v.ws_count} workspaces / ${v.item_count} items now in dev for loadtest users.`);
}

main().catch((err) => { console.error("Clone failed:", err); process.exit(1); });
