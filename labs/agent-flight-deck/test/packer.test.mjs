import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const AFD = createRequire(import.meta.url)("./load.cjs");
const P = AFD.packer;

test("gitignore semantics", () => {
  const rules = P.compileIgnore("node_modules/\n*.log\n/build\nsecret/**\n!keep.log\ndocs/*.tmp", "");
  assert.ok(P.isIgnored("node_modules/x/index.js", rules));
  assert.ok(P.isIgnored("pkg/node_modules/a.js", rules));
  assert.ok(P.isIgnored("server.log", rules));
  assert.ok(!P.isIgnored("keep.log", rules));
  assert.ok(P.isIgnored("build/out.js", rules));
  assert.ok(!P.isIgnored("src/build/out.js", rules), "anchored /build only matches at root");
  assert.ok(P.isIgnored("secret/a/b.txt", rules));
  assert.ok(P.isIgnored("docs/a.tmp", rules));
  assert.ok(!P.isIgnored("docs/sub/a.tmp", rules));
  assert.ok(!P.isIgnored("src/index.ts", rules));
});

test("nested .gitignore applies under its own folder", () => {
  const rules = P.compileIgnore("*.gen.ts", "packages/api");
  assert.ok(P.isIgnored("packages/api/src/x.gen.ts", rules));
  assert.ok(!P.isIgnored("packages/web/x.gen.ts", rules));
});

test("prepare skips ignored, binary and strips a shared root folder", () => {
  const raw = Object.entries(AFD.sample.repo).map(([p, text]) => ({ path: "checkout-service/" + p, text, size: text.length }));
  const { files, skipped, root } = P.prepare(raw);
  assert.equal(root, "checkout-service");
  const paths = files.map((f) => f.path);
  assert.ok(paths.includes("src/routes/login.ts"));
  for (const p of ["node_modules/express/index.js", "dist/server.js", "coverage/lcov.info", "server.log", "assets/logo.png"]) {
    assert.ok(!paths.includes(p), p);
    assert.ok(skipped.some((s) => s.path === p), "skipped " + p);
  }
});

test("token estimate is in a plausible range for code and prose", () => {
  const code = "export function add(a: number, b: number): number {\n  return a + b;\n}\n".repeat(20);
  const prose = "The quick brown fox jumps over the lazy dog. ".repeat(40);
  const ct = P.estimateTokens(code);
  const pt = P.estimateTokens(prose);
  assert.ok(code.length / ct > 2.2 && code.length / ct < 4.5, "code chars/token " + code.length / ct);
  assert.ok(prose.length / pt > 3.5 && prose.length / pt < 5.5, "prose chars/token " + prose.length / pt);
  assert.equal(P.estimateTokens(""), 0);
});

test("relevance ranks the files a question is about", () => {
  const raw = Object.entries(AFD.sample.repo).map(([p, text]) => ({ path: p, text }));
  const { files } = P.prepare(raw);
  P.scoreFiles(files, AFD.sample.repoQuestion);
  const top = files.slice().sort((a, b) => b.score - a.score).slice(0, 3).map((f) => f.path);
  assert.ok(top.includes("src/routes/login.ts"), top.join(","));
  assert.ok(top.includes("src/middleware/rateLimit.ts") || top.includes("test/login.test.ts"), top.join(","));
});

test("autoSelect respects the budget", () => {
  const raw = Object.entries(AFD.sample.repo).map(([p, text]) => ({ path: p, text }));
  const { files } = P.prepare(raw);
  P.scoreFiles(files, "login rate limit");
  P.autoSelect(files, 1200, {});
  const used = files.filter((f) => f.include).reduce((a, f) => a + f.tokens, 0);
  assert.ok(used <= 1200 && used > 0, String(used));
});

test("comment stripping removes whole-line comments only", () => {
  const src = "#!/usr/bin/env node\n// header\nconst url = 'http://x'; // keep\n/* block\n   more */\nconst a = 1;\n/** doc */\nfunction f() {}\n// @ts-ignore\nx();\n";
  const out = P.transform(src, "js", { stripComments: true });
  assert.ok(out.startsWith("#!/usr/bin/env node"));
  assert.ok(!out.includes("// header"));
  assert.ok(out.includes("const url = 'http://x'; // keep"));
  assert.ok(!out.includes("block"));
  assert.ok(!out.includes("/** doc */"));
  assert.ok(out.includes("// @ts-ignore"));
  assert.ok(out.includes("function f() {}"));
  const py = P.transform("# c\nx = '#not'\n\n\n\ny = 2", "py", { stripComments: true, collapseBlank: true });
  assert.equal(py, "x = '#not'\n\ny = 2");
});

test("prompt formats put documents first and the question last", () => {
  const files = [{ path: "a/b.ts", lang: "ts", text: "const x = 1 < 2;", tokens: 6, include: true }, { path: "c.md", lang: "doc", text: "hi", tokens: 1, include: false }];
  const xml = P.buildPrompt(files, { format: "xml", includeTree: true, question: "why?", projectName: "p" });
  assert.equal(xml.files, 1);
  assert.ok(xml.text.indexOf("<documents>") < xml.text.indexOf("<question>"));
  assert.ok(xml.text.includes("<source>a/b.ts</source>"));
  assert.ok(xml.text.includes("const x = 1 < 2;"), "document content is not escaped");
  assert.ok(!xml.text.includes("c.md"));
  const md = P.buildPrompt([{ path: "r.md", lang: "doc", text: "```js\nx\n```", tokens: 3, include: true }], { format: "markdown" });
  assert.ok(md.text.includes("````markdown"), "uses a longer fence when content has fences");
});

test("tree renders nested folders, directories first", () => {
  assert.equal(P.tree(["src/a.ts", "src/lib/b.ts", "README.md"]), "├── src/\n│   ├── lib/\n│   │   └── b.ts\n│   └── a.ts\n└── README.md");
});

test("squarify covers the area without overlap", () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((v, i) => ({ value: v, id: i }));
  const rects = P.squarify(items, 0, 0, 600, 400);
  assert.equal(rects.length, 7);
  const area = rects.reduce((a, r) => a + r.w * r.h, 0);
  assert.ok(Math.abs(area - 240000) < 1e-6);
  for (const r of rects) assert.ok(r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= 600 + 1e-6 && r.y + r.h <= 400 + 1e-6);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    assert.ok(!(ox > 1e-6 && oy > 1e-6), `overlap ${i} ${j}`);
  }
});
