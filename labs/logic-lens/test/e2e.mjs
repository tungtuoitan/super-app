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

// what the mocked Claude returns, and how it behaves
const MOCK_FLOW = {
  title: "Đếm từ trong file",
  summary: "Đọc file, đếm số lần xuất hiện của mỗi từ, in 10 từ nhiều nhất.",
  steps: [
    { kind: "step", title: "Nhận đường dẫn", sub: "từ dòng lệnh", lines: [1, 2] },
    { kind: "stage", title: "1. Đọc file", sub: "từng dòng, bỏ dấu câu", lines: [3, 5], detail: "Mở file bằng UTF-8." },
    { kind: "branch", lanes: [
      { title: "File rỗng", attention: true, lines: [6, 7], steps: [{ kind: "step", title: "Báo lỗi", sub: "thoát với mã 1", lines: [7, 7] }] },
      { title: "Có nội dung", lines: [8, 10], steps: [{ kind: "step", title: "Đếm bằng Counter", lines: [9, 9] }, { kind: "step", title: "In top 10", lines: [10, 10] }] },
    ] },
    { kind: "stage", title: "Kết thúc", lines: [11, 11] },
  ],
};
const MOCK_CODE = "import sys\npath = sys.argv[1]\nwith open(path, encoding='utf-8') as f:\n    text = f.read()\n    words = text.split()\nif not words:\n    sys.exit(1)\nfrom collections import Counter\nc = Counter(words)\nprint(c.most_common(10))\nprint('done')";

function mockClaude(page, mode) {
  return page.addInitScript(({ flow, mode }) => {
    window.__saved = [];
    window.__prompts = [];
    const sample = async () => ({ text: "" });
    sample.json = (prompt, opts) => {
      window.__prompts.push(prompt);
      if (mode === "denied") return Promise.reject({ code: "not_granted", message: "no" });
      return new Promise((resolve, reject) => {
        const t1 = setTimeout(() => opts.onText && opts.onText({ text: "{\"title\":", delta: "{\"title\":" }), 150);
        const t2 = setTimeout(() => resolve(JSON.parse(JSON.stringify(flow))), mode === "slow" ? 5000 : 500);
        if (opts.signal) opts.signal.addEventListener("abort", () => { clearTimeout(t1); clearTimeout(t2); reject({ code: "cancelled", message: "stop" }); });
      });
    };
    const downloads = { save: async (req) => { window.__saved.push({ filename: req.filename, size: typeof req.data === "string" ? req.data.length : req.data.size }); return { status: "saved" }; } };
    window.claude = { use: async (name) => (name === "sample" ? sample : name === "downloads" ? downloads : null) };
  }, { flow: MOCK_FLOW, mode });
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

console.log("Example on first open");
let page = await newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" }, "ok");
await page.goto(app);
await page.waitForSelector(".ll-node");
const nodes = await page.locator(".ll-node").count();
ok(nodes === 21, `SQL example draws 21 clickable boxes (${nodes})`);
ok((await page.locator(".ll-itemg").count()) === 4, "group shows its 4 inner boxes");
ok((await page.locator("#d-title").textContent()).includes("RFD"), "diagram title shown");
await page.screenshot({ path: path.join(shots, "1-sql-light.png"), fullPage: true });

console.log("Click a box");
await page.locator('.ll-node[data-id="1"]').click();
ok((await page.locator("#explain h3").textContent()).includes("Ghép điều kiện lọc"), "explanation shows the clicked box");
ok((await page.locator(".code-line.hl").count()) >= 5, "its code lines are highlighted");
const firstHl = await page.locator(".code-line.hl .c").first().textContent();
ok(firstHl.includes("-- 1. Build the WHERE"), "highlight starts at the right line: " + firstHl.trim().slice(0, 40));
const hlVisible = await page.evaluate(() => { const v = document.getElementById("code-view"); const l = v.querySelector(".code-line.hl"); return l.offsetTop >= v.scrollTop && l.offsetTop < v.scrollTop + v.clientHeight; });
await page.waitForTimeout(500);
ok(await page.evaluate(() => { const v = document.getElementById("code-view"); const l = v.querySelector(".code-line.hl"); return l.offsetTop >= v.scrollTop - 1 && l.offsetTop < v.scrollTop + v.clientHeight; }), "code panel scrolled to the highlighted lines");

// click a group item selects the group
await page.locator(".ll-itemg").first().click();
ok((await page.locator("#explain h3").textContent()).includes("FROM"), "clicking an inner box selects its group");

console.log("Step by step");
await page.locator("#tour").click();
ok((await page.locator(".ll-node.dim").count()) === nodes - 1, "tour dims every other box");
const c1 = await page.locator("#counter").textContent();
await page.locator("#next").click();
await page.keyboard.press("ArrowRight");
const c2 = await page.locator("#counter").textContent();
ok(c1 !== c2 && /\d+ \/ 21/.test(c2), `next and → advance (${c1} → ${c2})`);
await page.screenshot({ path: path.join(shots, "2-tour.png"), fullPage: false });
await page.keyboard.press("Escape");
ok((await page.locator(".ll-node.dim").count()) === 0, "Esc leaves the tour");

console.log("Zoom & export");
await page.locator("#zoom-in").click();
ok(/%$/.test(await page.locator("#zoom-fit").textContent()), "zoom in shows a percentage");
await page.locator("#zoom-fit").click();
await page.locator("#copy-mermaid").click();
await page.waitForTimeout(150);
const mm = await page.evaluate(() => navigator.clipboard.readText());
ok(mm.startsWith("flowchart TD") && mm.includes("-->"), "Copy Mermaid puts a flowchart on the clipboard");
ok(await page.locator("#dl-png").isVisible(), "download buttons appear when downloads are available");
await page.locator("#dl-svg").click();
await page.locator("#dl-png").click();
await page.waitForTimeout(1500);
console.log("    toast:", await page.locator(".toast").textContent().catch(() => "-"));
const saved = await page.evaluate(() => window.__saved);
ok(saved.length === 2 && saved[0].filename.endsWith(".svg") && saved[1].filename.endsWith(".png") && saved[1].size > 5000, "SVG and PNG are offered for download: " + JSON.stringify(saved));

console.log("Text editing");
await page.locator("#dsl-panel summary").click();
const dsl = await page.locator("#dsl").inputValue();
ok(dsl.includes("branch") && /lane\s+Timeline/.test(dsl), "diagram text is shown");
await page.locator("#dsl").fill(dsl.replace("step  Nhận tham số", "warn  Nhận tham số mới"));
await page.waitForTimeout(500);
ok((await page.locator('.ll-node[data-id="0"] text').first().textContent()).includes("mới"), "editing the text redraws the diagram");
ok((await page.locator('.ll-node[data-id="0"] .ll-attn').count()) === 1, "warn makes a dashed attention box");
await page.locator("#dsl").fill("step ok\nnonsense here\n");
await page.waitForTimeout(500);
ok((await page.locator("#dsl-errors li").count()) === 1 && (await page.locator("#dsl-errors").textContent()).includes("Dòng 2"), "text mistakes are reported with their line");

console.log("Draw with Claude (mocked)");
await page.selectOption("#example", "");
await page.locator("#code-toggle").click();
await page.locator("#code").fill(MOCK_CODE);
await page.locator("#detail-seg button", { hasText: "Gọn" }).click();
await page.locator("#draw").click();
await page.waitForFunction(() => document.querySelectorAll(".ll-node").length === 8, null, { timeout: 5000 });
ok(true, "Claude's answer is drawn (8 boxes)");
const prompt = await page.evaluate(() => window.__prompts[0]);
ok(prompt.includes(" 1| import sys") && prompt.includes("4 to 7 top-level boxes") && prompt.includes("Vietnamese"), "prompt carries numbered code, detail level and language");
ok(/Xong sau/.test(await page.locator("#status").textContent()), "status reports completion");
await page.locator('.ll-node[data-id="2.l0"]').click();
ok((await page.locator(".code-line.hl .c").first().textContent()).includes("if not words"), "Claude's line numbers map to the pasted code");
await page.screenshot({ path: path.join(shots, "3-claude.png"), fullPage: true });

// persistence across reload
await page.reload();
await page.waitForSelector(".ll-node");
ok((await page.locator(".ll-node").count()) === 8 && (await page.locator("#d-title").textContent()).includes("Đếm từ"), "the last diagram and code come back after a reload");

console.log("Stop & denied");
const slow = await newPage({ viewport: { width: 1280, height: 900 } }, "slow");
await slow.goto(app);
await slow.waitForSelector(".ll-node");
await slow.locator("#draw").click();
await slow.waitForTimeout(400);
ok(await slow.locator("#stop").isVisible(), "a Stop button shows while Claude works");
await slow.locator("#stop").click();
await slow.waitForTimeout(200);
ok((await slow.locator("#status").textContent()).includes("Đã dừng") && (await slow.locator(".ll-node").count()) === 21, "Stop cancels and keeps the old diagram");

const denied = await newPage({ viewport: { width: 1280, height: 900 } }, "denied");
await denied.goto(app);
await denied.waitForSelector(".ll-node");
await denied.locator("#draw").click();
await denied.waitForTimeout(300);
ok((await denied.locator("#status").textContent()).includes("chưa cho phép") && (await denied.locator("#alt").getAttribute("open")) !== null, "a refused permission explains the copy-paste route and opens it");

console.log("No Claude at all (standalone)");
const bare = await newPage({ viewport: { width: 1280, height: 900 } });
await bare.goto(app);
await bare.waitForSelector(".ll-node");
await bare.locator("#draw").click();
await bare.waitForTimeout(300);
ok((await bare.locator("#alt").getAttribute("open")) !== null, "without Claude the copy-paste route is offered");
await bare.locator("#copy-prompt").click();
await bare.waitForTimeout(150);
ok((await bare.evaluate(() => navigator.clipboard.readText())).includes("Reply with only the JSON object"), "Copy prompt copies the full instruction");
await bare.locator("#reply").fill("Here it is:\n```json\n" + JSON.stringify(MOCK_FLOW) + "\n```");
await bare.locator("#use-reply").click();
ok((await bare.locator(".ll-node").count()) === 8, "a pasted reply is drawn");
ok(!(await bare.locator("#dl-png").isVisible()), "download buttons stay hidden without the capability");

console.log("Examples, dark theme, phone");
for (const id of ["js", "py"]) {
  await bare.selectOption("#example", id);
  await bare.waitForTimeout(200);
  ok((await bare.locator(".ll-node").count()) > 6, `example ${id} draws`);
  await bare.screenshot({ path: path.join(shots, `4-example-${id}.png`), fullPage: true });
}
const dark = await newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
await dark.goto(app);
await dark.waitForSelector(".ll-node");
await dark.locator('.ll-node[data-id="4.l2"]').click();
await dark.screenshot({ path: path.join(shots, "5-dark.png"), fullPage: false });
ok((await dark.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(15, 20, 25)", "dark theme applied");
const phone = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await phone.goto(app);
await phone.waitForSelector(".ll-node");
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(overflow <= 0, `no horizontal page scroll on a phone (${overflow}px)`);
await phone.locator('.ll-node[data-id="3"]').tap();
ok((await phone.locator("#explain h3").textContent()).includes("Chọn chế độ"), "tapping a box works on a phone");
await phone.screenshot({ path: path.join(shots, "6-phone.png"), fullPage: true });

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join("\n- ") : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
