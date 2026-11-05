// End-to-end check in a real browser (Playwright + Chromium). Usage: node test/e2e.mjs
// window.claude is mocked the way the claude.ai viewer provides it, so the "draw with Claude" path runs for real.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const app = "file://" + path.resolve(here, "../dist/logic-lens.standalone.html");
const shots = process.env.SHOTS || path.resolve(here, "../.e2e");
fs.mkdirSync(shots, { recursive: true });

const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); console.log((cond ? "  ✓ " : "  ✗ ") + msg); };

const MOCK_CODE = "import sys\npath = sys.argv[1]\nwith open(path, encoding='utf-8') as f:\n    text = f.read()\n    words = text.split()\nif not words:\n    sys.exit(1)\nfrom collections import Counter\nc = Counter(words)\nprint(c.most_common(10))\nprint('done')";
const MOCK_FLOW = {
  title: "Đếm từ trong file",
  summary: "Đọc file, đếm số lần xuất hiện của mỗi từ, in 10 từ nhiều nhất.",
  steps: [
    { kind: "start", title: "Chạy script", sub: "từ dòng lệnh", lines: [1, 2] },
    { kind: "stage", title: "1. Đọc file", sub: "từng dòng, bỏ dấu câu", lines: [3, 5], detail: "Mở file bằng UTF-8." },
    { kind: "branch", question: "Có từ nào?", lanes: [
      { title: "File rỗng", attention: true, lines: [6, 7], steps: [{ kind: "end", exit: "exit", title: "Thoát với mã 1", lines: [7, 7] }] },
      { title: "Có nội dung", lines: [8, 10], steps: [{ kind: "step", title: "Đếm bằng Counter", lines: [9, 9] }, { kind: "step", title: "In top 10", lines: [10, 10] }] },
    ] },
    { kind: "end", title: "In done", lines: [11, 11] },
  ],
};
// change mode: the "after" adds a guard for an empty word list and changes the output count
const CH_BEFORE = "import sys\npath = sys.argv[1]\nwith open(path) as f:\n    words = f.read().split()\nfrom collections import Counter\nc = Counter(words)\nprint(c.most_common(5))";
const CH_AFTER = "import sys\npath = sys.argv[1]\nwith open(path, encoding='utf-8') as f:\n    words = f.read().split()\nif not words:\n    sys.exit(1)\nfrom collections import Counter\nc = Counter(words)\nprint(c.most_common(10))";
const MOCK_CHANGE = {
  title: "Đếm từ (sau khi sửa)",
  summary: "Đọc file và in các từ nhiều nhất.",
  changeSummary: "Thêm kiểm tra file rỗng và đọc file bằng UTF-8.",
  steps: [
    { kind: "start", title: "Chạy script", lines: [1, 2] },
    { kind: "step", title: "Đọc file UTF-8", lines: [3, 4], change: "modified", changeNote: "Thêm encoding='utf-8'." },
    { kind: "branch", question: "File rỗng?", change: "added", lanes: [
      { title: "Rỗng", lines: [5, 6], change: "added", steps: [{ kind: "end", exit: "exit", title: "Thoát mã 1", lines: [6, 6], change: "added" }] },
      { title: "Có từ", steps: [] },
    ] },
    { kind: "step", title: "Đếm và in top", lines: [7, 9] },
  ],
};

function mockClaude(page, mode) {
  return page.addInitScript(({ flow, change, mode }) => {
    window.__saved = [];
    window.__prompts = [];
    const sample = async () => ({ text: "" });
    sample.json = (prompt, opts) => {
      window.__prompts.push(prompt);
      if (mode === "denied") return Promise.reject({ code: "not_granted", message: "no" });
      const reply = prompt.includes("This is a CODE CHANGE") ? change : flow;
      return new Promise((resolve, reject) => {
        const t1 = setTimeout(() => opts.onText && opts.onText({ text: "{\"title\":", delta: "{\"title\":" }), 150);
        const t2 = setTimeout(() => resolve(JSON.parse(JSON.stringify(reply))), mode === "slow" ? 5000 : 400);
        if (opts.signal) opts.signal.addEventListener("abort", () => { clearTimeout(t1); clearTimeout(t2); reject({ code: "cancelled", message: "stop" }); });
      });
    };
    const downloads = { save: async (req) => { window.__saved.push({ filename: req.filename, size: typeof req.data === "string" ? req.data.length : req.data.size }); return { status: "saved" }; } };
    window.claude = { use: async (name) => (name === "sample" ? sample : name === "downloads" ? downloads : null) };
  }, { flow: MOCK_FLOW, change: MOCK_CHANGE, mode });
}

const browser = await chromium.launch();
async function newPage(opts, mode) {
  const ctx = await browser.newContext(opts);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|net::/.test(m.text())) problems.push("console: " + m.text()); });
  if (mode) await mockClaude(page, mode);
  return page;
}
const typeInto = (page, sel, text) => page.locator(sel + " .ed-ta").fill(text);
const status = (page) => page.locator("#status").textContent();

console.log("First open: an example is drawn");
let page = await newPage({ viewport: { width: 1440, height: 950 }, colorScheme: "light" }, "ok");
await page.goto(app);
await page.waitForSelector(".ll-node");
ok((await page.locator(".ll-node").count()) === 21, "SQL example draws 21 clickable boxes");
ok((await page.locator("#code-info").textContent()).includes("sql"), "code info names the language");
ok((await page.locator("#ed-code .ed-l").count()) > 50, "editor shows highlighted lines");
await page.screenshot({ path: path.join(shots, "1-first-open.png") });

console.log("Click a box → card + code range");
await page.locator('.ll-node[data-id="1"]').click();
ok(!(await page.locator("#explain-card").isHidden()), "explanation card opens");
ok((await page.locator("#explain h3").textContent()).includes("Ghép điều kiện lọc"), "card shows the clicked box");
ok((await page.locator("#ed-code .ed-l.on").count()) >= 5, "its code lines are highlighted in the editor");
await page.locator("#card-next").click();
ok((await page.locator("#explain-pos").textContent()).startsWith("Ô 3"), "card › moves to the next box");
await page.keyboard.press("Escape");
ok(await page.locator("#explain-card").isHidden(), "Escape closes the card");

console.log("Click a code line → its box");
await page.waitForTimeout(400); // let the editor's smooth scroll settle
await page.locator("#ed-code .ed-ta").click({ position: { x: 200, y: 20 * 21 + 8 } });
await page.waitForTimeout(150);
ok(!(await page.locator("#explain-card").isHidden()), "clicking a line selects the box that covers it");

console.log("Tour");
const at = parseInt((await page.locator("#explain-pos").textContent()).replace(/\D+/, ""), 10);
await page.locator("#tour").click();
ok((await page.locator("#explain-pos").textContent()).startsWith("Ô " + at), "tour continues from the selected box");
await page.keyboard.press("ArrowRight");
ok((await page.locator("#explain-pos").textContent()).startsWith("Ô " + (at + 1)), "arrow key steps forward");
await page.locator("#tour").click();

console.log("All examples render (every code type and every change example)");
const ids = await page.$$eval("#example option", (os) => os.map((o) => o.value).filter(Boolean));
ok(ids.length >= 19, `${ids.length} examples in the menu`);
for (const id of ids) {
  await page.selectOption("#example", id);
  await page.waitForTimeout(120);
  const n = await page.locator(".ll-node").count();
  const overlap = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".ll-node > .ll-shape, .ll-node > rect")].map((e) => e.getBoundingClientRect());
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      const inside = (p, q) => p.left >= q.left - 1 && p.right <= q.right + 1 && p.top >= q.top - 1 && p.bottom <= q.bottom + 1;
      if (inside(a, b) || inside(b, a)) continue; // containers hold their children
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return true;
    }
    return false;
  });
  ok(n >= 8 && !overlap, `${id}: ${n} boxes, no overlaps`);
}

console.log("Change example: marks in diagram and editor, only-changes tour");
await page.selectOption("#example", "change-webhook");
await page.waitForTimeout(150);
ok(await page.locator('#mode-seg [data-v="change"]').getAttribute("aria-selected") === "true", "switches to change mode");
ok(!(await page.locator("#change-bar").isHidden()), "change bar shows the summary");
ok((await page.locator("#change-bar .pill").count()) >= 1, "change counts shown");
ok((await page.locator(".ll-chip").count()) >= 3, "changed boxes carry + / ~ chips");
ok((await page.locator("#ed-after .ed-g.add").count()) >= 5, "added lines marked in the Sau editor");
await page.screenshot({ path: path.join(shots, "2-change.png") });
await page.locator("#only-changes").check();
await page.locator("#tour").click();
ok((await page.locator("#explain-pos").textContent()).startsWith("Thay đổi 1"), "tour walks only the changed boxes");
ok((await page.locator("#explain .changebox").count()) === 1, "card explains what changed");
await page.screenshot({ path: path.join(shots, "3-change-tour.png") });
await page.locator("#tour").click();
await page.locator("#only-changes").uncheck();

console.log("Export + legend");
await page.locator("#export-btn").click();
ok(!(await page.locator("#export-menu").isHidden()), "export menu opens");
await page.locator("#copy-mermaid").click();
const mer = await page.evaluate(() => navigator.clipboard.readText());
ok(mer.startsWith("flowchart TD"), "Copy Mermaid gives a flowchart");
await page.locator("#export-btn").click();
await page.locator("#dl-svg").click();
await page.waitForTimeout(200);
ok((await page.evaluate(() => window.__saved.map((s) => s.filename))).some((f) => f.endsWith(".svg")), "SVG download handed to the viewer");
await page.locator("#legend-btn").click();
ok(!(await page.locator("#legend").isHidden()), "legend opens");
await page.screenshot({ path: path.join(shots, "4-legend.png") });
await page.keyboard.press("Escape");

console.log("Draw code with Claude");
await page.locator('#mode-seg [data-v="code"]').click();
await typeInto(page, "#ed-code", MOCK_CODE);
await page.locator("#draw").click();
await page.waitForFunction(() => document.getElementById("d-title").textContent.includes("Đếm từ"), null, { timeout: 5000 });
ok((await page.locator(".ll-node").count()) >= 6, "Claude's diagram drawn");
ok((await status(page)).includes("ô"), "status reports the box count");
const p1 = await page.evaluate(() => window.__prompts.at(-1));
ok(p1.includes("1| import sys"), "prompt carries numbered code");

console.log("Draw a change with Claude, from before + git diff");
await page.locator('#mode-seg [data-v="change"]').click();
await page.locator('#code-tabs [data-tab="before"]').click();
await typeInto(page, "#ed-before", CH_BEFORE);
await page.locator('#code-tabs [data-tab="after"]').click();
await typeInto(page, "#ed-after", "");
const unified = "--- a/count.py\n+++ b/count.py\n@@ -1,7 +1,9 @@\n import sys\n path = sys.argv[1]\n-with open(path) as f:\n+with open(path, encoding='utf-8') as f:\n     words = f.read().split()\n+if not words:\n+    sys.exit(1)\n from collections import Counter\n c = Counter(words)\n-print(c.most_common(5))\n+print(c.most_common(10))\n";
await page.locator("#paste-diff").click();
await page.locator("#diff-input").fill(unified);
await page.locator("#diff-apply").click();
await page.waitForTimeout(350);
ok((await page.locator("#ed-after .ed-ta").inputValue()) === CH_AFTER, "git diff rebuilds the Sau code from Trước");
await page.locator("#draw").click();
await page.waitForFunction(() => document.getElementById("d-title").textContent.includes("sau khi sửa"), null, { timeout: 5000 });
const p2 = await page.evaluate(() => window.__prompts.at(-1));
ok(/\+\|/.test(p2) && /-\|/.test(p2), "change prompt marks added and removed lines");
ok((await page.locator(".ll-chip").count()) >= 2, "changed boxes marked in the drawn diagram");
await page.screenshot({ path: path.join(shots, "5-change-drawn.png") });

console.log("Each mode keeps its own diagram");
await page.locator('#mode-seg [data-v="code"]').click();
ok((await page.locator("#d-title").textContent()).includes("Đếm từ trong file"), "back in Code mode: the code diagram returns");
await page.locator('#mode-seg [data-v="change"]').click();
ok((await page.locator("#d-title").textContent()).includes("sau khi sửa"), "back in change mode: the change diagram returns");

console.log("Edits after drawing shift the highlighted lines");
await page.locator('#mode-seg [data-v="code"]').click();
await typeInto(page, "#ed-code", "# header\n# more\n" + MOCK_CODE);
await page.waitForTimeout(400);
await page.locator('.ll-node[data-id="1"]').click();
const onLines = await page.$$eval("#ed-code .ed-g.on", (g) => g.map((x) => +x.textContent));
ok(onLines[0] === 5 && onLines.at(-1) === 7, "box 'Đọc file' follows its code to lines 5–7: " + onLines.join(","));
await page.keyboard.press("Escape");
await page.locator('#mode-seg [data-v="change"]').click();
await page.locator("#paste-diff").click();
await page.keyboard.press("Escape");
ok(await page.locator("#diff-dialog").isHidden(), "Esc closes the git diff box");

await page.selectOption("#example", "py");
await page.waitForTimeout(150);
await page.selectOption("#example", "change-sync");
await page.waitForTimeout(150);
await page.locator('#mode-seg [data-v="code"]').click();
ok((await page.locator("#d-title").textContent()).includes("CSV"), "an example that switches mode keeps the left mode's diagram");
await page.locator('#mode-seg [data-v="change"]').click();
ok((await page.locator("#d-title").textContent()).includes("CRM"), "and the change example comes back");
await page.reload();
await page.waitForSelector(".ll-node");
await page.locator('#mode-seg [data-v="code"]').click();
ok((await page.locator("#d-title").textContent()).includes("CSV"), "the other mode's diagram survives a reload");

console.log("Stop and errors");
await page.close();
page = await newPage({ viewport: { width: 1280, height: 860 } }, "denied");
await page.goto(app);
await page.waitForSelector(".ll-node");
await page.locator("#draw").click();
await page.waitForTimeout(300);
ok((await status(page)).includes("chưa cho phép"), "denied Claude explained");
ok(await page.locator("#alt").evaluate((d) => d.open), "fallback section opens");

console.log("Draft survives reload");
await typeInto(page, "#ed-code", "def hi():\n    return 1\n");
await page.waitForTimeout(700);
await page.reload();
await page.waitForTimeout(400);
ok((await page.locator("#ed-code .ed-ta").inputValue()).startsWith("def hi()"), "code restored from draft");
await page.close();

console.log("Dark theme + phone");
page = await newPage({ viewport: { width: 1440, height: 950 }, colorScheme: "dark" }, "ok");
await page.goto(app);
await page.waitForSelector(".ll-node");
await page.selectOption("#example", "go-worker-pool");
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(shots, "6-dark.png") });
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(bg !== "rgb(255, 255, 255)", "dark theme paints a dark page: " + bg);
await page.close();

page = await newPage({ ...require("playwright").devices["iPhone 13"] }, "ok");
await page.goto(app);
await page.waitForSelector(".ll-node");
await page.selectOption("#example", "change-sync");
await page.waitForTimeout(250);
const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
ok(sw <= 0, "no horizontal page scroll on a phone");
await page.screenshot({ path: path.join(shots, "7-phone-diagram.png") });
await page.locator('.mobile-tabs [data-pane="code"]').click();
await page.waitForTimeout(150);
ok(await page.locator("#pane-code").isVisible(), "phone: code pane shows");
await page.screenshot({ path: path.join(shots, "8-phone-code.png") });
await page.locator('.mobile-tabs [data-pane="canvas"]').click();
await page.locator(".ll-node").nth(2).click();
await page.waitForTimeout(150);
ok(!(await page.locator("#explain-card").isHidden()), "phone: tapping a box opens the card");
await page.screenshot({ path: path.join(shots, "9-phone-card.png") });

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join("\n- ") : "\nAll e2e checks passed.");
process.exit(problems.length ? 1 : 0);
