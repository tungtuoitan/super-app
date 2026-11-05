// End-to-end check in a real browser. Usage: node test/e2e.mjs [path/to/session.jsonl] [path/to/code/folder]
// Needs Playwright with Chromium available (require('playwright')).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const app = "file://" + path.resolve(here, "../dist/agent-flight-deck.standalone.html");
const shots = process.env.SHOTS || path.resolve(here, "../.e2e");
fs.mkdirSync(shots, { recursive: true });
const realLog = process.argv[2];
const codeDir = process.argv[3];

const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); console.log((cond ? "  ✓ " : "  ✗ ") + msg); };

const browser = await chromium.launch();
async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_|net::/.test(m.text())) problems.push("console: " + m.text()); });
  return page;
}

// ── desktop, light
console.log("Flight Recorder (example)");
let page = await newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
await page.goto(app);
await page.waitForSelector(".gauges");
ok(await page.locator(".pill.example").isVisible(), "example session badge is shown");
ok((await page.locator(".finding").count()) >= 4, "findings are listed");
ok((await page.locator(".tl-svg rect").count()) > 20, "timeline has drawn marks");
ok((await page.locator(".feed .ev").count()) > 30, "transcript rows rendered");
await page.screenshot({ path: path.join(shots, "1-recorder-light.png"), fullPage: true });

ok((await page.locator(".insp").textContent()).includes("Same tokens on other models"), "inspector re-prices the session on other models");
await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
await page.locator("button", { hasText: "Copy report" }).click();
await page.waitForTimeout(200);
const report = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
ok(report.startsWith("## Claude Code session:") && report.includes("### Findings"), "Copy report puts a Markdown summary on the clipboard");

// click a finding reference -> inspector shows that event
await page.locator(".finding .fr button").first().click();
ok(await page.locator(".insp .eyebrow").first().textContent().then((t) => /Event \d+/.test(t)), "finding jump selects an event");
ok((await page.locator(".ev.cur").count()) === 1, "transcript highlights the selected row");

// click the timeline
const svg = page.locator(".tl-svg");
const box = await svg.boundingBox();
await page.mouse.click(box.x + box.width * 0.5, box.y + 75);
ok(await page.locator(".insp h4").count() > 0, "timeline click fills the inspector");

// play for a moment
await page.locator(".play-btn").click();
await page.waitForTimeout(1200);
const pos1 = await page.locator(".player .pos").textContent();
await page.waitForTimeout(800);
const pos2 = await page.locator(".player .pos").textContent();
ok(pos1 !== pos2, `replay advances (${pos1} -> ${pos2})`);
ok((await page.locator(".ev.future").count()) > 0, "future events are dimmed during replay");
await page.locator(".play-btn").click();

// keyboard
await page.locator(".rec-title h1").click();
const k0 = await page.locator(".player .pos").textContent();
await page.keyboard.press("ArrowLeft");
await page.keyboard.press("ArrowLeft");
ok((await page.locator(".player .pos").textContent()) !== k0, "arrow keys step through events");
await page.keyboard.press("/");
ok(await page.evaluate(() => document.activeElement && document.activeElement.id === "rec-search"), "/ focuses the transcript search");
await page.keyboard.press("Escape");

// filters & search
await page.fill("#rec-search", "npm test");
ok((await page.locator(".feed .ev").count()) >= 2 && (await page.locator(".feed .ev").count()) < 10, "search narrows the transcript");
await page.fill("#rec-search", "");
await page.locator(".filters button", { hasText: "Thinking" }).click();
ok((await page.locator(".feed .ev.k-thinking").count()) === 0, "thinking filter hides thinking rows");
await page.locator(".filters button", { hasText: "Thinking" }).click();

// turns table row jumps
await page.locator(".charts .panel").nth(3).locator("tbody tr").nth(1).click();
ok(/turn 2/.test(await page.locator(".insp .eyebrow").first().textContent()), "turn row jumps to that turn");

// cost chart click
const cc = page.locator(".charts .chart-svg").first();
const cb = await cc.boundingBox();
await page.mouse.click(cb.x + cb.width * 0.3, cb.y + cb.height * 0.6);
ok(/API call \d+/.test(await page.locator(".insp").textContent()), "cost chart click shows the API call cost breakdown");

// real log via file input
if (realLog) {
  console.log("Flight Recorder (real log)");
  await page.setInputFiles("#rec-file", realLog);
  await page.waitForFunction(() => !document.querySelector(".pill.example"));
  const title = await page.locator(".rec-title h1").textContent();
  ok(title.length > 3, "real session title: " + title.slice(0, 60));
  const cost = await page.locator(".gauge .v").first().textContent();
  ok(/^\$\d/.test(cost), "real session cost: " + cost);
  await page.screenshot({ path: path.join(shots, "2-recorder-real.png"), fullPage: false });
  // two files -> fleet view
  const ex = path.join(shots, "example-session.jsonl");
  fs.writeFileSync(ex, await page.evaluate(() => AFD.sample.sessionJsonl()));
  await page.setInputFiles("#rec-file", [realLog, ex]);
  await page.waitForSelector(".fleet");
  ok((await page.locator(".fleet tbody tr").count()) >= 2, "two logs open the all-sessions view");
  await page.screenshot({ path: path.join(shots, "3-fleet.png"), fullPage: true });
  await page.locator(".fleet .panel").last().locator("tbody tr").first().click();
  await page.waitForSelector(".gauges");
  ok(await page.locator(".back").isVisible(), "session opened from the list has a back button");
}

// garbage file
await page.evaluate(() => {
  const dt = new DataTransfer();
  dt.items.add(new File(["not json at all\n{]"], "broken.jsonl", { type: "application/json" }));
  const zone = document.querySelector("#view-recorder .dropbar");
  zone.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
});
await page.waitForTimeout(400);
ok(/no Claude Code messages/.test(await page.locator("#view-recorder .notice").textContent()), "a broken file shows a clear message (via drag and drop)");

// ── Load Sheet
console.log("Load Sheet");
await page.locator("#tab-loadsheet").click();
await page.waitForSelector(".tm-cell");
ok((await page.locator(".tm-cell").count()) >= 8, "treemap cells drawn for the example project");
const loaded = await page.locator(".tm-cell:not(.off)").count();
const unloaded = await page.locator(".tm-cell.off").count();
ok(loaded > 0 && unloaded > 0, `auto-load picked a subset under the 4K example budget (${loaded} loaded, ${unloaded} not)`);
ok(/^Within|free/.test(await page.locator(".wb-status").textContent()), "weight & balance says it fits");
const preview = await page.locator(".out-pre").textContent();
ok(preview.includes("<document index=\"1\">") && preview.includes("<question>"), "XML prompt has documents then the question");
ok(preview.includes("src/routes/login.ts"), "the login route made the cut");
ok(!preview.includes("node_modules"), "node_modules never appears");
await page.screenshot({ path: path.join(shots, "4-loadsheet-light.png"), fullPage: true });

// toggle a file
const firstOff = page.locator(".tm-cell.off").first();
await firstOff.click();
ok((await page.locator(".tm-cell.off").count()) === unloaded - 1, "clicking a treemap cell loads that file");

// format switch
await page.locator(".seg button", { hasText: "Markdown" }).click();
ok((await page.locator(".out-pre").textContent()).startsWith("# checkout-service"), "markdown format renders");
await page.locator(".seg button", { hasText: "XML" }).click();

// strip comments shrinks tokens
const before = await page.locator(".wb-big").textContent();
await page.check("#ls-opt-stripComments");
const after = await page.locator(".wb-big").textContent();
ok(before !== after, `stripping comments changes the payload (${before.trim()} -> ${after.trim()})`);
await page.uncheck("#ls-opt-stripComments");

// copy
await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
await page.locator("button", { hasText: "Copy prompt" }).click();
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
ok(clip.includes("<documents>"), "copy puts the full prompt on the clipboard");

// real folder via the directory input
if (codeDir) {
  const files = [];
  const walk = (d) => { for (const n of fs.readdirSync(d)) { if (n === "node_modules" || n === ".git" || n === "dist" || n === ".e2e") continue; const p = path.join(d, n); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else files.push(p); } };
  walk(codeDir);
  await page.setInputFiles("#ls-file", files.slice(0, 400));
  await page.waitForFunction(() => /Loaded \d+ files/.test(document.querySelector("#view-loadsheet .notice").textContent), null, { timeout: 30000 });
  ok(true, (await page.locator("#view-loadsheet .notice").textContent()).slice(0, 120));
  ok((await page.locator("#ls-budget").inputValue()) === "200000", "opening a real folder resets the example's 4K budget to 200K");
  await page.fill("#ls-question", "how is the timeline scale selector persisted to storage");
  await page.locator("button", { hasText: "Auto-load" }).click();
  await page.waitForTimeout(300);
  ok(/free/.test(await page.locator(".wb-status").textContent()), "auto-load fits the real project in the budget");
  await page.screenshot({ path: path.join(shots, "5-loadsheet-real.png"), fullPage: false });
}

// ── dark theme + phone
console.log("Dark theme & phone");
const dark = await newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
await dark.goto(app + "#recorder");
await dark.waitForSelector(".gauges");
const bg = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok(bg === "rgb(12, 18, 24)", "dark theme background applied (" + bg + ")");
await dark.screenshot({ path: path.join(shots, "6-recorder-dark.png"), fullPage: false });
await dark.locator("#theme").click();
ok((await dark.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light", "theme toggle switches to light");

for (const [name, hash] of [["recorder", "#recorder"], ["loadsheet", "#loadsheet"]]) {
  const phone = await newPage({ viewport: { width: 390, height: 844 }, colorScheme: "light", isMobile: true, hasTouch: true });
  await phone.goto(app + hash);
  await phone.waitForTimeout(500);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 0, `${name} has no horizontal page scroll on a phone (overflow ${overflow}px)`);
  await phone.screenshot({ path: path.join(shots, `7-phone-${name}.png`), fullPage: true });
}

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join("\n- ") : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
