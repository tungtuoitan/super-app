/**
 * seed-users.js
 *
 * Seeds N local-auth users into [urm].[users] for load testing.
 * Password hashing uses BCrypt to match Timeline AuthService.LocalLoginAsync,
 * which calls BCrypt.Net.BCrypt.Verify(password, user.Password).
 *
 * Idempotent: existing emails are updated (re-hashed with fresh salt).
 *
 * Usage:
 *   npm install         (once)
 *   npm run seed        (uses .env)
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const sql = require("mssql");

const BCRYPT_ROUNDS = 11; // BCrypt.Net default workfactor

function hashPassword(password) {
    return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function buildEmail(prefix, domain, i) {
    const padded = String(i).padStart(4, "0");
    return `${prefix}${padded}@${domain}`;
}

function getConfig() {
    const cfg = {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT || "1433", 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            trustServerCertificate: true,
            encrypt: false,
        },
        requestTimeout: 120_000,
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
        userCount: parseInt(process.env.LOADTEST_USER_COUNT || "1000", 10),
        emailPrefix: process.env.LOADTEST_EMAIL_PREFIX || "loadtest+",
        emailDomain: process.env.LOADTEST_EMAIL_DOMAIN || "test.local",
        password_: process.env.LOADTEST_PASSWORD || "LoadTest@123",
    };
    const missing = ["server", "database", "user", "password"].filter((k) => !cfg[k]);
    if (missing.length) {
        console.error(`Missing env vars: ${missing.map((k) => "DB_" + k.toUpperCase()).join(", ")}`);
        process.exit(1);
    }
    return cfg;
}

async function main() {
    const cfg = getConfig();
    console.log(`Seeding ${cfg.userCount} users into ${cfg.server}/${cfg.database} ...`);
    console.log(`  Email pattern: ${cfg.emailPrefix}NNNN@${cfg.emailDomain}`);
    console.log(`  Password:      ${cfg.password_}`);

    const pool = await sql.connect(cfg);

    const sharedHash = hashPassword(cfg.password_);
    console.log(`  Hashed password (bcrypt rounds=${BCRYPT_ROUNDS})`);

    const upsertSql = `
        MERGE [urm].[users] AS tgt
        USING (SELECT @email AS email) AS src
        ON tgt.email = src.email
        WHEN MATCHED THEN UPDATE SET
            password    = @password,
            auth_type   = 'local',
            is_active   = 1,
            deleted_at  = NULL,
            updated_at  = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (email, password, auth_type, is_active, created_at)
            VALUES (@email, @password, 'local', 1, SYSUTCDATETIME());
    `;

    const t0 = Date.now();
    const batchSize = 50;
    let done = 0;

    for (let start = 1; start <= cfg.userCount; start += batchSize) {
        const end = Math.min(start + batchSize - 1, cfg.userCount);
        const batch = [];
        for (let i = start; i <= end; i++) {
            const email = buildEmail(cfg.emailPrefix, cfg.emailDomain, i);
            const req = pool.request();
            req.input("email", sql.NVarChar(255), email);
            req.input("password", sql.NVarChar(255), sharedHash);
            batch.push(req.query(upsertSql));
        }
        await Promise.all(batch);
        done = end;
        const pct = ((done / cfg.userCount) * 100).toFixed(1);
        process.stdout.write(`\r  seeded ${done}/${cfg.userCount} (${pct}%)`);
    }

    console.log();

    const verify = await pool.request()
        .input("prefix", sql.NVarChar(255), `${cfg.emailPrefix}%@${cfg.emailDomain}`)
        .query(`SELECT COUNT(*) AS cnt FROM [urm].[users] WHERE email LIKE @prefix AND deleted_at IS NULL`);
    const cnt = verify.recordset[0].cnt;

    await pool.close();

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done in ${dt}s. Active loadtest users in DB: ${cnt}.`);
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
