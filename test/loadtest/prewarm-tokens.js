/**
 * prewarm-tokens.js
 *
 * Logs in N users sequentially (concurrency-limited) and writes their JWTs
 * to results/tokens.json. Lets k6 skip the bcrypt-heavy login during steady
 * state, so the test isolates non-auth endpoint capacity.
 *
 * Usage:  node prewarm-tokens.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const BASE_URL    = process.env.LOADTEST_BASE_URL    || "http://localhost:5000";
const USER_COUNT  = parseInt(process.env.LOADTEST_USER_COUNT || "1000", 10);
const PREFIX      = process.env.LOADTEST_EMAIL_PREFIX || "loadtest+";
const DOMAIN      = process.env.LOADTEST_EMAIL_DOMAIN || "test.local";
const PASSWORD    = process.env.LOADTEST_PASSWORD     || "LoadTest@123";
const CONCURRENCY = parseInt(process.env.PREWARM_CONCURRENCY || "20", 10);

async function loginOne(i) {
    const email = `${PREFIX}${String(i).padStart(4, "0")}@${DOMAIN}`;
    const body = new URLSearchParams({ username: email, password: PASSWORD }).toString();

    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            continue;
        }
        if (!res.ok) throw new Error(`${email}: ${res.status}`);
        const data = await res.json();
        return data.user?.token || data.token;
    }
    throw new Error(`${email}: rate-limited after retries`);
}

async function main() {
    console.log(`Pre-warming ${USER_COUNT} tokens against ${BASE_URL} (concurrency=${CONCURRENCY})...`);

    const tokens = new Array(USER_COUNT);
    const t0 = Date.now();
    let done = 0, failed = 0;

    let next = 1;
    async function worker() {
        while (true) {
            const i = next++;
            if (i > USER_COUNT) return;
            try {
                tokens[i - 1] = await loginOne(i);
            } catch {
                failed++;
                tokens[i - 1] = null;
            }
            done++;
            if (done % 100 === 0) {
                process.stdout.write(`\r  logged in ${done}/${USER_COUNT} (${failed} failed)`);
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log();

    const valid = tokens.filter(Boolean);
    const out = path.join(__dirname, "results", "tokens.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(valid));

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done in ${dt}s. ${valid.length}/${USER_COUNT} tokens saved -> ${out}`);
    if (failed) console.log(`  ${failed} logins failed.`);
}

main().catch((err) => { console.error("Prewarm failed:", err); process.exit(1); });
