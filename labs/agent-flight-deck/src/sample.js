/* Agent Flight Deck — built-in examples.
 * 1. A synthetic Claude Code session, written in the real .jsonl format and parsed by the same code as user files.
 * 2. A small example repository for the Load Sheet.
 * Both are invented and labelled as examples in the UI.
 */
(function (AFD) {
  "use strict";

  function sampleSessionJsonl() {
    const sessionId = "example-session-0001";
    const cwd = "/Users/dev/checkout-service";
    const lines = [];
    let clock = Date.UTC(2026, 9, 14, 8, 2, 11);
    let msgN = 0;
    let toolN = 0;
    let ctx = 21400; // system prompt + tools
    let lastModel = "claude-sonnet-5-5";
    let cacheWarm = false;
    let lastCallT = 0;

    const iso = () => new Date(clock).toISOString();
    const tick = (s) => (clock += Math.round(s * 1000));
    const base = (extra) => Object.assign({ sessionId, cwd, gitBranch: "feat/login-rate-limit", version: "2.1.318", entrypoint: "cli", userType: "external", isSidechain: false, timestamp: iso(), uuid: "u" + lines.length }, extra);

    function prompt(text) {
      tick(2);
      lines.push(base({ type: "user", message: { role: "user", content: text }, origin: { kind: "human" } }));
      ctx += Math.ceil(text.length / 3.5) + 40;
    }

    function command(name, args) {
      tick(1);
      lines.push(base({ type: "user", message: { role: "user", content: `<command-name>${name}</command-name>\n<command-message>${name.slice(1)}</command-message>\n<command-args>${args}</command-args>` } }));
    }

    /** One API call: blocks = [{thinking}|{text}|{tool:{name,input}}], returns tool ids */
    function call(blocks, opts) {
      const o = opts || {};
      const model = o.model || lastModel;
      tick(o.think || 4 + (msgN % 5));
      const now = clock;
      const gap = lastCallT ? now - lastCallT : 0;
      const modelChanged = model !== lastModel;
      let cacheRead = 0;
      let cacheWrite = 0;
      const fresh = 3 + (msgN % 7);
      if (!cacheWarm || gap > 5 * 60 * 1000 || modelChanged) {
        cacheWrite = ctx - fresh;
        cacheWarm = true;
      } else {
        cacheRead = Math.round(ctx * 0.93);
        cacheWrite = ctx - cacheRead - fresh;
      }
      const out = o.out || 180 + ((msgN * 37) % 600);
      const thinkTok = blocks.some((b) => b.thinking !== undefined) ? Math.round(out * 0.35) : 0;
      const usage = {
        input_tokens: fresh,
        cache_creation_input_tokens: cacheWrite,
        cache_read_input_tokens: cacheRead,
        output_tokens: out,
        output_tokens_details: { thinking_tokens: thinkTok },
        cache_creation: { ephemeral_5m_input_tokens: cacheWrite, ephemeral_1h_input_tokens: 0 },
        service_tier: "standard",
      };
      const id = "msg_example_" + String(++msgN).padStart(3, "0");
      const ids = [];
      for (const b of blocks) {
        let content;
        if (b.thinking !== undefined) content = { type: "thinking", thinking: b.thinking, signature: "" };
        else if (b.text) content = { type: "text", text: b.text };
        else if (b.tool) {
          const tid = "toolu_ex_" + String(++toolN).padStart(3, "0");
          ids.push(tid);
          content = { type: "tool_use", id: tid, name: b.tool.name, input: b.tool.input };
        }
        lines.push(base({ type: "assistant", isSidechain: !!o.side, requestId: "req_" + id, thinkingDurationMs: b.thinking !== undefined ? 2600 + (msgN % 4) * 900 : undefined, message: { id, type: "message", role: "assistant", model, content: [content], usage, stop_reason: null } }));
      }
      ctx += out - thinkTok;
      lastModel = model;
      lastCallT = now;
      return ids;
    }

    function result(id, text, opts) {
      const o = opts || {};
      tick(o.secs || 1.2);
      lines.push(base({ type: "user", isSidechain: !!o.side, message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: text, is_error: !!o.error }] }, toolUseResult: o.extra || {} }));
      if (!o.side) ctx += Math.ceil(text.length / 3.5);
    }

    const fileBody = (name, n) => Array.from({ length: n }, (_, i) => `${String(i + 1).padStart(4)}→  // ${name} line ${i + 1}`).join("\n");
    const testLog = (pass) => {
      const rows = [];
      for (let i = 0; i < 140; i++) rows.push(`  ✓ checkout › cart › applies promo code variant ${i} (${3 + (i % 9)} ms)`);
      if (!pass) rows.push("  ✕ auth › login › locks the account after 5 failed attempts (12 ms)\n\n    Expected: 429\n    Received: 200\n\n      at Object.<anonymous> (test/login.test.ts:48:31)");
      rows.push(pass ? "\nTest Suites: 24 passed, 24 total\nTests:       318 passed, 318 total" : "\nTest Suites: 1 failed, 23 passed, 24 total\nTests:       1 failed, 317 passed, 318 total");
      return rows.join("\n");
    };

    // ── Turn 1
    prompt("Add rate limiting to POST /api/login: max 5 failed attempts per email per 15 minutes, then 429 with a Retry-After header. Use the existing Redis client.");
    let ids = call([{ thinking: "" }, { text: "I'll look at how the login route and the Redis client are wired up first." }, { tool: { name: "Glob", input: { pattern: "src/**/*.{ts,js}" } } }]);
    result(ids[0], "src/server.ts\nsrc/routes/login.ts\nsrc/routes/cart.ts\nsrc/lib/redis.ts\nsrc/lib/errors.ts\nsrc/middleware/auth.ts\nsrc/db/users.ts");
    ids = call([{ tool: { name: "Read", input: { file_path: cwd + "/src/routes/login.ts" } } }, { tool: { name: "Read", input: { file_path: cwd + "/src/lib/redis.ts" } } }]);
    result(ids[0], fileBody("login.ts", 64), { extra: { file: { numLines: 64, totalLines: 64 } } });
    result(ids[1], fileBody("redis.ts", 38), { extra: { file: { numLines: 38, totalLines: 38 } } });
    ids = call([{ tool: { name: "Grep", input: { pattern: "redis\\.(incr|expire)", path: "src", output_mode: "content" } } }]);
    result(ids[0], "src/routes/cart.ts:88:  await redis.incr(`cart:views:${id}`)\nsrc/routes/cart.ts:89:  await redis.expire(`cart:views:${id}`, 3600)");
    ids = call([{ thinking: "" }, { text: "There's no limiter yet. I'll add a small middleware keyed by email and wire it into the login route." }, { tool: { name: "Write", input: { file_path: cwd + "/src/middleware/rateLimit.ts", content: "import { redis } from '../lib/redis';\n\nconst WINDOW_S = 15 * 60;\nconst MAX_FAILS = 5;\n\nexport async function loginFailures(email: string) {\n  const n = Number(await redis.get(`login:fail:${email}`)) || 0;\n  const ttl = await redis.ttl(`login:fail:${email}`);\n  return { blocked: n >= MAX_FAILS, retryAfter: Math.max(ttl, 0) };\n}\n\nexport async function recordFailure(email: string) {\n  const key = `login:fail:${email}`;\n  const n = await redis.incr(key);\n  if (n === 1) await redis.expire(key, WINDOW_S);\n}\n\nexport async function clearFailures(email: string) {\n  await redis.del(`login:fail:${email}`);\n}\n" } } }], { out: 900 });
    result(ids[0], "File created successfully at: " + cwd + "/src/middleware/rateLimit.ts");
    ids = call([{ tool: { name: "Edit", input: { file_path: cwd + "/src/routes/login.ts", old_string: "const user = await findUser(email)", new_string: "const gate = await loginFailures(email);\n  if (gate.blocked) {\n    res.setHeader('Retry-After', String(gate.retryAfter));\n    return res.status(429).json({ error: 'too_many_attempts' });\n  }\n  const user = await findUser(email)" } } }]);
    result(ids[0], "<tool_use_error>String to replace not found in file.\nString: const user = await findUser(email)</tool_use_error>", { error: true });
    ids = call([{ text: "The line differs slightly; re-reading the handler." }, { tool: { name: "Read", input: { file_path: cwd + "/src/routes/login.ts", offset: 20, limit: 30 } } }]);
    result(ids[0], fileBody("login.ts", 30));
    ids = call([{ tool: { name: "Edit", input: { file_path: cwd + "/src/routes/login.ts", old_string: "const user = await users.findByEmail(email);", new_string: "const gate = await loginFailures(email);\n  if (gate.blocked) {\n    res.setHeader('Retry-After', String(gate.retryAfter));\n    return res.status(429).json({ error: 'too_many_attempts' });\n  }\n  const user = await users.findByEmail(email);" } } }]);
    result(ids[0], "The file " + cwd + "/src/routes/login.ts has been updated.");
    ids = call([{ tool: { name: "Edit", input: { file_path: cwd + "/src/routes/login.ts", old_string: "if (!ok) return res.status(401)", new_string: "if (!ok) {\n    await recordFailure(email);\n    return res.status(401)" } } }]);
    result(ids[0], "The file " + cwd + "/src/routes/login.ts has been updated.");
    ids = call([{ text: "Running the test suite." }, { tool: { name: "Bash", input: { command: "npm test 2>&1 | tail -n 200", description: "Run the test suite" } } }]);
    result(ids[0], testLog(true), { secs: 48 });
    call([{ text: "Done. `POST /api/login` now returns **429** with `Retry-After` after 5 failed attempts per email within 15 minutes. Counters live in Redis under `login:fail:<email>` and reset on a successful login. All 318 tests pass." }], { out: 260 });

    // ── coffee break: 14 minutes idle, the 5-minute cache expires
    tick(14 * 60);

    // ── Turn 2
    prompt("Also add a test for the lockout, and make sure a successful login clears the counter.");
    ids = call([{ thinking: "" }, { tool: { name: "Read", input: { file_path: cwd + "/src/routes/login.ts" } } }]);
    result(ids[0], fileBody("login.ts", 78));
    // the same unchanged file read again in slices: a re-read the findings should catch
    ids = call([{ tool: { name: "Read", input: { file_path: cwd + "/src/routes/login.ts", offset: 30, limit: 40 } } }]);
    result(ids[0], fileBody("login.ts", 40));
    ids = call([{ tool: { name: "Read", input: { file_path: cwd + "/src/routes/login.ts", offset: 60, limit: 20 } } }]);
    result(ids[0], fileBody("login.ts", 20));
    ids = call([{ tool: { name: "Bash", input: { command: "cat test/login.test.ts", description: "Show login tests" } } }]);
    result(ids[0], fileBody("login.test.ts", 52));
    ids = call([{ tool: { name: "Bash", input: { command: "grep -rn \"clearFailures\" src test", description: "Find clearFailures usage" } } }]);
    result(ids[0], "src/middleware/rateLimit.ts:17:export async function clearFailures(email: string) {");
    ids = call([{ text: "`clearFailures` is never called. Fixing that and adding the test." }, { tool: { name: "Edit", input: { file_path: cwd + "/src/routes/login.ts", old_string: "return res.json({ token })", new_string: "await clearFailures(email);\n  return res.json({ token })" } } }]);
    result(ids[0], "The file " + cwd + "/src/routes/login.ts has been updated.");
    ids = call([{ tool: { name: "Edit", input: { file_path: cwd + "/test/login.test.ts", old_string: "describe('login', () => {", new_string: "describe('login', () => {\n  it('locks the account after 5 failed attempts', async () => {\n    for (let i = 0; i < 5; i++) await post('/api/login', { email: 'a@x.io', password: 'bad' });\n    const res = await post('/api/login', { email: 'a@x.io', password: 'bad' });\n    expect(res.status).toBe(429);\n    expect(res.headers['retry-after']).toBeDefined();\n  });\n\n  it('clears the counter after a successful login', async () => {\n    await post('/api/login', { email: 'b@x.io', password: 'bad' });\n    await post('/api/login', { email: 'b@x.io', password: 'right' });\n    expect(await redis.get('login:fail:b@x.io')).toBeNull();\n  });" } } }], { out: 1100 });
    result(ids[0], "The file " + cwd + "/test/login.test.ts has been updated.");
    ids = call([{ tool: { name: "Bash", input: { command: "npm test 2>&1", description: "Run the test suite" } } }]);
    result(ids[0], testLog(false), { secs: 51, error: true });
    ids = call([{ thinking: "" }, { text: "The lockout test fails: the 6th request still gets 200. The test Redis isn't flushed between tests, so I'll check the setup." }, { tool: { name: "Read", input: { file_path: cwd + "/test/setup.ts" } } }]);
    result(ids[0], fileBody("setup.ts", 22));
    ids = call([{ tool: { name: "Read", input: { file_path: cwd + "/src/routes/login.ts" } } }]);
    result(ids[0], fileBody("login.ts", 80));
    ids = call([{ text: "Found it: the gate runs after `validateBody`, which rejects the bad password shape first. Moving the check up." }, { tool: { name: "Edit", input: { file_path: cwd + "/src/routes/login.ts", old_string: "router.post('/login', validateBody(loginSchema), async (req, res) => {", new_string: "router.post('/login', rateLimitGate, validateBody(loginSchema), async (req, res) => {" } } }]);
    result(ids[0], "The file " + cwd + "/src/routes/login.ts has been updated.");
    ids = call([{ tool: { name: "Bash", input: { command: "npm test 2>&1", description: "Run the test suite" } } }]);
    result(ids[0], testLog(true), { secs: 49 });
    call([{ text: "Added two tests (lockout after 5 failures, counter cleared on success) and fixed the order of middleware so the limiter runs before body validation. 320 tests pass." }], { out: 210 });

    // ── Turn 3: switch to Opus for a review, with a subagent
    tick(95);
    command("/model", "claude-opus-5-5");
    prompt("Review the whole change for race conditions and security issues before I open the PR.");
    ids = call([{ thinking: "" }, { text: "I'll have a subagent sweep the other auth routes for the same pattern while I review the limiter." }, { tool: { name: "Task", input: { description: "Audit auth routes", subagent_type: "Explore", prompt: "List every route under src/routes that authenticates a user, and whether it is rate limited." } } }], { model: "claude-opus-5-5", out: 700 });
    const taskId = ids[0];
    // sidechain (subagent) calls
    let sid = call([{ tool: { name: "Grep", input: { pattern: "router\\.(post|put)", path: "src/routes", output_mode: "files_with_matches" } } }], { model: "claude-haiku-5-5", side: true, out: 120 });
    result(sid[0], "src/routes/login.ts\nsrc/routes/password-reset.ts\nsrc/routes/signup.ts\nsrc/routes/cart.ts", { side: true });
    sid = call([{ tool: { name: "Read", input: { file_path: cwd + "/src/routes/password-reset.ts" } } }], { model: "claude-haiku-5-5", side: true, out: 90 });
    result(sid[0], fileBody("password-reset.ts", 70), { side: true });
    call([{ text: "password-reset.ts and signup.ts accept credentials without any rate limit." }], { model: "claude-haiku-5-5", side: true, out: 160 });
    lastModel = "claude-opus-5-5";
    result(taskId, "Routes that authenticate: login.ts (rate limited), password-reset.ts (NOT limited), signup.ts (NOT limited).", { secs: 2 });
    ids = call([{ thinking: "" }, { tool: { name: "Read", input: { file_path: cwd + "/src/middleware/rateLimit.ts" } } }], { model: "claude-opus-5-5" });
    result(ids[0], fileBody("rateLimit.ts", 22));
    call([{ thinking: "" }, { text: "Review findings:\n\n1. **Race condition (minor):** `INCR` then `EXPIRE` is two round trips; if the process dies between them the key never expires. Use `SET key 0 EX 900 NX` first, or a `MULTI`.\n2. **Enumeration:** the 429 is returned before checking the user exists, which is good: it doesn't leak whether the email is registered.\n3. **Gap:** `password-reset` and `signup` have no limiter. Worth the same gate keyed by IP.\n\nWant me to fix 1 and 3?" }], { model: "claude-opus-5-5", out: 1400 });

    return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  }

  // ───────────────────────── example repository ─────────────────────────

  const SAMPLE_REPO = {
    ".gitignore": "node_modules/\ndist/\ncoverage/\n*.log\n.env\n",
    "README.md": "# checkout-service\n\nExpress + Redis service that handles carts, checkout and login for the shop.\n\n## Run\n\n```bash\nnpm install\nnpm run dev\n```\n\n## Layout\n\n- `src/routes` HTTP handlers\n- `src/middleware` express middleware (auth, rate limiting)\n- `src/lib` shared clients (redis, errors)\n- `src/db` data access\n",
    "package.json": JSON.stringify({ name: "checkout-service", version: "1.4.0", private: true, scripts: { dev: "tsx watch src/server.ts", test: "vitest run", build: "tsc -p ." }, dependencies: { express: "4.21.2", ioredis: "5.4.2", zod: "3.24.1", jsonwebtoken: "9.0.2" }, devDependencies: { typescript: "5.7.3", vitest: "3.0.5", tsx: "4.19.2", supertest: "7.0.0" } }, null, 2) + "\n",
    "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", strict: true, outDir: "dist" }, include: ["src"] }, null, 2) + "\n",
    "src/server.ts": "import express from 'express';\nimport { loginRouter } from './routes/login';\nimport { cartRouter } from './routes/cart';\nimport { errorHandler } from './lib/errors';\n\nconst app = express();\napp.use(express.json());\n\n// Routes\napp.use('/api', loginRouter);\napp.use('/api/cart', cartRouter);\n\napp.use(errorHandler);\n\nconst port = Number(process.env.PORT) || 3000;\napp.listen(port, () => console.log(`checkout-service on :${port}`));\n",
    "src/routes/login.ts": "import { Router } from 'express';\nimport jwt from 'jsonwebtoken';\nimport { z } from 'zod';\nimport { users } from '../db/users';\nimport { loginFailures, recordFailure, clearFailures } from '../middleware/rateLimit';\n\nexport const loginRouter = Router();\n\nconst loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });\n\n/* POST /api/login\n * Returns a JWT for valid credentials. After 5 failed attempts per email\n * within 15 minutes the endpoint answers 429 with a Retry-After header.\n */\nloginRouter.post('/login', async (req, res) => {\n  const body = loginSchema.safeParse(req.body);\n  if (!body.success) return res.status(400).json({ error: 'invalid_body' });\n  const { email, password } = body.data;\n\n  const gate = await loginFailures(email);\n  if (gate.blocked) {\n    res.setHeader('Retry-After', String(gate.retryAfter));\n    return res.status(429).json({ error: 'too_many_attempts' });\n  }\n\n  const user = await users.findByEmail(email);\n  const ok = user && (await users.verifyPassword(user, password));\n  if (!ok) {\n    await recordFailure(email);\n    return res.status(401).json({ error: 'invalid_credentials' });\n  }\n\n  await clearFailures(email);\n  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });\n  return res.json({ token });\n});\n",
    "src/routes/cart.ts": "import { Router } from 'express';\nimport { redis } from '../lib/redis';\nimport { requireAuth } from '../middleware/auth';\n\nexport const cartRouter = Router();\n\n// GET /api/cart/:id\ncartRouter.get('/:id', requireAuth, async (req, res) => {\n  const raw = await redis.get(`cart:${req.params.id}`);\n  await redis.incr(`cart:views:${req.params.id}`);\n  await redis.expire(`cart:views:${req.params.id}`, 3600);\n  res.json(raw ? JSON.parse(raw) : { items: [] });\n});\n\n// POST /api/cart/:id/items\ncartRouter.post('/:id/items', requireAuth, async (req, res) => {\n  const key = `cart:${req.params.id}`;\n  const cart = JSON.parse((await redis.get(key)) || '{\"items\":[]}');\n  cart.items.push({ sku: req.body.sku, qty: Number(req.body.qty) || 1 });\n  await redis.set(key, JSON.stringify(cart), 'EX', 7 * 24 * 3600);\n  res.status(201).json(cart);\n});\n\n// POST /api/cart/:id/promo\ncartRouter.post('/:id/promo', requireAuth, async (req, res) => {\n  const code = String(req.body.code || '').toUpperCase();\n  const pct = { WELCOME10: 10, SPRING20: 20 }[code];\n  if (!pct) return res.status(404).json({ error: 'unknown_code' });\n  res.json({ code, discountPct: pct });\n});\n",
    "src/middleware/rateLimit.ts": "import { redis } from '../lib/redis';\n\nconst WINDOW_S = 15 * 60;\nconst MAX_FAILS = 5;\n\n/** Is this email locked out, and for how long? */\nexport async function loginFailures(email: string) {\n  const n = Number(await redis.get(`login:fail:${email}`)) || 0;\n  const ttl = await redis.ttl(`login:fail:${email}`);\n  return { blocked: n >= MAX_FAILS, retryAfter: Math.max(ttl, 0) };\n}\n\nexport async function recordFailure(email: string) {\n  const key = `login:fail:${email}`;\n  const n = await redis.incr(key);\n  if (n === 1) await redis.expire(key, WINDOW_S);\n}\n\nexport async function clearFailures(email: string) {\n  await redis.del(`login:fail:${email}`);\n}\n",
    "src/middleware/auth.ts": "import type { Request, Response, NextFunction } from 'express';\nimport jwt from 'jsonwebtoken';\n\n// Rejects requests without a valid bearer token.\nexport function requireAuth(req: Request, res: Response, next: NextFunction) {\n  const header = req.headers.authorization || '';\n  const token = header.startsWith('Bearer ') ? header.slice(7) : '';\n  try {\n    (req as any).userId = (jwt.verify(token, process.env.JWT_SECRET!) as any).sub;\n    next();\n  } catch {\n    res.status(401).json({ error: 'unauthorized' });\n  }\n}\n",
    "src/lib/redis.ts": "import Redis from 'ioredis';\n\n// One shared connection for the whole process.\nexport const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {\n  maxRetriesPerRequest: 2,\n  enableAutoPipelining: true,\n});\n",
    "src/lib/errors.ts": "import type { Request, Response, NextFunction } from 'express';\n\nexport class HttpError extends Error {\n  constructor(public status: number, message: string) {\n    super(message);\n  }\n}\n\nexport function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {\n  const status = err instanceof HttpError ? err.status : 500;\n  if (status >= 500) console.error(err);\n  res.status(status).json({ error: status >= 500 ? 'internal_error' : err.message });\n}\n",
    "src/db/users.ts": "import { createHash, timingSafeEqual } from 'node:crypto';\n\nexport interface User {\n  id: string;\n  email: string;\n  passwordHash: string;\n}\n\nconst table = new Map<string, User>();\n\nexport const users = {\n  async findByEmail(email: string) {\n    return [...table.values()].find((u) => u.email === email.toLowerCase()) || null;\n  },\n  async verifyPassword(user: User, password: string) {\n    const a = Buffer.from(createHash('sha256').update(password).digest('hex'));\n    const b = Buffer.from(user.passwordHash);\n    return a.length === b.length && timingSafeEqual(a, b);\n  },\n};\n",
    "test/login.test.ts": "import { describe, it, expect } from 'vitest';\nimport { post, redis } from './setup';\n\ndescribe('login', () => {\n  it('returns a token for valid credentials', async () => {\n    const res = await post('/api/login', { email: 'a@x.io', password: 'right' });\n    expect(res.status).toBe(200);\n    expect(res.body.token).toBeTypeOf('string');\n  });\n\n  it('locks the account after 5 failed attempts', async () => {\n    for (let i = 0; i < 5; i++) await post('/api/login', { email: 'b@x.io', password: 'bad' });\n    const res = await post('/api/login', { email: 'b@x.io', password: 'bad' });\n    expect(res.status).toBe(429);\n    expect(res.headers['retry-after']).toBeDefined();\n  });\n\n  it('clears the counter after a successful login', async () => {\n    await post('/api/login', { email: 'c@x.io', password: 'bad' });\n    await post('/api/login', { email: 'c@x.io', password: 'right' });\n    expect(await redis.get('login:fail:c@x.io')).toBeNull();\n  });\n});\n",
    "test/cart.test.ts": "import { describe, it, expect } from 'vitest';\nimport { post, get, token } from './setup';\n\ndescribe('cart', () => {\n  it('adds items', async () => {\n    const res = await post('/api/cart/c1/items', { sku: 'TSHIRT-M', qty: 2 }, token());\n    expect(res.status).toBe(201);\n    expect(res.body.items).toHaveLength(1);\n  });\n\n  it('applies a promo code', async () => {\n    const res = await post('/api/cart/c1/promo', { code: 'welcome10' }, token());\n    expect(res.body.discountPct).toBe(10);\n  });\n\n  it('rejects unknown promo codes', async () => {\n    const res = await post('/api/cart/c1/promo', { code: 'NOPE' }, token());\n    expect(res.status).toBe(404);\n  });\n});\n",
    "test/setup.ts": "import request from 'supertest';\nimport { beforeEach } from 'vitest';\nimport { redis } from '../src/lib/redis';\nimport { app } from '../src/server';\n\nexport { redis };\n\nbeforeEach(async () => {\n  await redis.flushdb();\n});\n\nexport const post = (url: string, body: object, auth?: string) => {\n  const r = request(app).post(url).send(body);\n  return auth ? r.set('Authorization', `Bearer ${auth}`) : r;\n};\nexport const get = (url: string) => request(app).get(url);\nexport const token = () => 'test-token';\n",
    "docs/adr-001-redis-sessions.md": "# ADR 001: Keep carts in Redis\n\n## Status\nAccepted\n\n## Context\nCarts are written often and read on every page view. Postgres added 30-40 ms per request under load.\n\n## Decision\nStore carts in Redis with a 7-day TTL. Orders are still written to Postgres at checkout.\n\n## Consequences\n- Cart data can be lost if Redis is flushed; acceptable for unpaid carts.\n- Rate limiting can reuse the same connection.\n",
    "node_modules/express/index.js": "module.exports = require('./lib/express');\n",
    "node_modules/ioredis/built/index.js": "\"use strict\";\nObject.defineProperty(exports, \"__esModule\", { value: true });\n",
    "dist/server.js": "\"use strict\";\n// compiled output\n",
    "coverage/lcov.info": "TN:\nSF:src/routes/login.ts\nDA:1,1\nend_of_record\n",
    "assets/logo.png": "\u0089PNG\r\n\u001a\n\u0000\u0000\u0000\rIHDR",
    "server.log": "2026-10-14T08:01:00Z info listening on :3000\n",
  };

  AFD.sample = {
    sessionJsonl: sampleSessionJsonl,
    sessionFileName: "example-session.jsonl",
    repo: SAMPLE_REPO,
    repoName: "checkout-service",
    repoQuestion: "Why does the 6th failed login still return 200 instead of 429, and how should I fix it?",
  };
})(globalThis.AFD = globalThis.AFD || {});
