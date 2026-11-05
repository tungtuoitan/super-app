import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const LL = createRequire(import.meta.url)("./load.cjs");

const overlap = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

test("boxes stay inside the drawing and never overlap (items only inside their group)", () => {
  for (const ex of LL.sample.EXAMPLES) {
    const { flow } = LL.sample.getExample(ex.id);
    const L = LL.layout.layout(flow);
    for (const b of L.boxes) {
      assert.ok(b.x >= 0 && b.x + b.w <= L.width + 0.5 && b.y >= 0 && b.y + b.h <= L.height, `${ex.id} ${b.id} out of bounds`);
    }
    const solid = L.boxes;
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], b = solid[j];
      const inside = (c, x) => c.container && (x.groupId === c.id || x.id.startsWith(c.id + "."));
      if (inside(a, b) || inside(b, a)) { const [c, x] = inside(a, b) ? [a, b] : [b, a]; assert.ok(x.x >= c.x && x.x + x.w <= c.x + c.w && x.y >= c.y && x.y + x.h <= c.y + c.h, `${ex.id}: ${x.id} outside ${c.id}`); continue; }
      const parentChild = false;
      if (parentChild) { assert.ok(b.kind === "group" || (b.x >= a.x && b.x + b.w <= a.x + a.w && b.y >= a.y && b.y + b.h <= a.y + a.h), `${ex.id}: item ${b.id} outside its group`); continue; }
      assert.ok(!overlap(a, b), `${ex.id}: ${a.id} overlaps ${b.id}`);
    }
  }
});

test("reading order goes downward: every top-level box starts below the previous one", () => {
  const { flow } = LL.sample.getExample("sql");
  const L = LL.layout.layout(flow);
  const tops = L.boxes.filter((b) => /^\d+$/.test(b.id)).sort((a, b) => +a.id - +b.id);
  for (let i = 1; i < tops.length; i++) assert.ok(tops[i].y > tops[i - 1].y + tops[i - 1].h, `box ${tops[i].id}`);
});

test("lanes sit side by side at the same height", () => {
  const { flow } = LL.sample.getExample("sql");
  const L = LL.layout.layout(flow);
  const lanes = L.boxes.filter((b) => b.lane);
  assert.equal(lanes.length, 4);
  assert.ok(lanes.every((l) => l.y === lanes[0].y));
  for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i].x > lanes[i - 1].x + lanes[i - 1].w);
});

test("nested branches and a branch as the first box lay out without errors", () => {
  const flow = LL.flow.normalize({ steps: [
    { kind: "branch", lanes: [{ title: "A", steps: [{ kind: "branch", lanes: [{ title: "A1", steps: [{ title: "x" }] }, { title: "A2" }] }, { title: "after" }] }, { title: "B" }] },
    { title: "end" },
  ] });
  const L = LL.layout.layout(flow);
  assert.equal(L.boxes.length, 7);
  const svg = LL.layout.toSvg(flow, L, { interactive: true });
  assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
  assert.equal((svg.match(/class="ll-node"/g) || []).length, 7);
});

test("text wraps and long titles are clipped with an ellipsis", () => {
  const f = LL.layout.FONT.title;
  const lines = LL.layout.wrap("one two three four five six seven eight nine ten eleven twelve", f, 80, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("…"));
  assert.ok(LL.layout.wrap("Supercalifragilisticexpialidocious", f, 60).length > 1);
});

test("svg escapes text", () => {
  const flow = LL.flow.normalize({ title: "<x>", steps: [{ title: "a < b && \"c\"" }] });
  const svg = LL.layout.toSvg(flow, null, { interactive: true });
  assert.ok(svg.includes("a &lt; b &amp;&amp; &quot;c&quot;"));
  assert.ok(!svg.includes("<x>"));
});

const W = (flow, o) => LL.layout.layout(LL.flow.normalize(flow), o);
const big = { steps: [
  { title: "Input" },
  { kind: "branch", title: "mode", lanes: ["a", "b", "c", "d", "e", "f"].map((t, i) => ({ title: "lane " + t, steps: i === 0 ? [
    { kind: "branch", lanes: [{ title: "x", steps: [{ kind: "branch", lanes: [{ title: "x1", steps: [{ title: "Retry 3 lần" }] }, { title: "x2", steps: [{ kind: "end", title: "fail" }] }] }] }, { title: "y" }, { title: "z" }] },
  ] : [{ title: "step " + t }] })) },
  { kind: "group", title: "many", items: Array.from({ length: 8 }, (_, i) => ({ title: "item number " + i, sub: "with a sub line" })) },
  { title: "A very long title that keeps going and going far beyond what a box can hold in two lines of text", sub: "window.open(someVeryLongIdentifierName.withProperty_access) and more words here to wrap" },
  { kind: "end", title: "Done" },
] };

test("deep nesting widens the drawing instead of crushing boxes", () => {
  for (const narrow of [false, true]) {
    const L = W(big, { narrow });
    for (const b of L.boxes) assert.ok(b.w >= 100, `${narrow ? "narrow" : "wide"}: ${b.id} is ${Math.round(b.w)}px wide`);
    assert.ok(L.width >= 880);
  }
  assert.ok(W(big).width > 880, "six lanes with nesting need more than the base width");
});

test("no overlaps in the stress flow, wide and narrow", () => {
  for (const narrow of [false, true]) {
    const L = W(big, { narrow });
    const solid = L.boxes.filter((b) => !b.container);
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) assert.ok(!overlap(solid[i], solid[j]), `${narrow}: ${solid[i].id} overlaps ${solid[j].id}`);
    for (const b of L.boxes) assert.ok(b.x >= 0 && b.x + b.w <= L.width + 0.5, `${b.id} out of bounds`);
  }
});

test("titles and subs are capped at two lines", () => {
  const L = W(big);
  for (const b of L.boxes) { assert.ok(b.titleLines.length <= 2, b.id); assert.ok(b.subLines.length <= 2, b.id); }
  const long = L.boxes.find((b) => b.node && b.node.title.startsWith("A very long"));
  assert.ok(long.titleLines[long.titleLines.length - 1].endsWith("…"), "overlong text ends with an ellipsis, never mid-word");
  const narrowBox = LL.layout.layout(LL.flow.normalize({ steps: [{ kind: "branch", lanes: [{ title: "x", steps: [{ title: "Một tiêu đề khá dài cho một ô hẹp trong nhánh" }] }, { title: "y" }, { title: "z" }, { title: "w" }, { title: "v" }] }] }));
  const clipped = narrowBox.boxes.find((b) => b.node && b.node.title && b.node.title.startsWith("Một"));
  assert.ok(clipped.titleLines.length <= 2);
});

test("a lane that ends early does not join the merge", () => {
  const flow = { steps: [{ title: "in" }, { kind: "branch", lanes: [{ title: "bad", steps: [{ kind: "end", title: "return 400" }] }, { title: "ok" }] }, { title: "out" }] };
  const L = W(flow);
  const end = L.boxes.find((b) => b.kind === "end");
  const below = L.edges.filter((e) => e.d.startsWith(`M${end.x + end.w / 2} ${end.y + end.h}`));
  assert.equal(below.length, 0, "nothing leaves the end box");
  const narrowL = W(flow, { narrow: true });
  const end2 = narrowL.boxes.find((b) => b.kind === "end");
  assert.equal(narrowL.edges.filter((e) => e.d.startsWith(`M${end2.x + end2.w / 2} ${end2.y + end2.h}`)).length, 0);
});

test("loops draw a frame around their body and a return arrow", () => {
  const L = W({ steps: [{ title: "in" }, { kind: "loop", title: "each row", steps: [{ title: "a" }, { title: "b" }] }, { title: "out" }] });
  const frame = L.boxes.find((b) => b.kind === "loop");
  const body = L.boxes.filter((b) => b.id.startsWith(frame.id + "."));
  assert.equal(body.length, 2);
  for (const b of body) assert.ok(b.x >= frame.x && b.x + b.w <= frame.x + frame.w && b.y >= frame.y && b.y + b.h <= frame.y + frame.h, b.id + " inside the loop frame");
  assert.ok(L.edges.some((e) => e.loop && e.arrow));
});

test("a branch question becomes a label", () => {
  const L = W({ steps: [{ title: "in" }, { kind: "branch", title: "@ViewMode", lanes: [{ title: "list" }, { title: "kanban" }] }, { title: "out" }] });
  assert.equal(L.labels.length, 1);
  assert.equal(L.labels[0].text, "@ViewMode");
});

test("identifiers break at punctuation, not mid-word, when they must break", () => {
  const lines = LL.layout.wrap("window.someVeryLongIdentifierName", LL.layout.FONT.title, 150);
  assert.ok(lines[0].endsWith("."), JSON.stringify(lines));
});

test("narrow layout: the question label sits below the box above it", () => {
  const L = LL.layout.layout(LL.flow.normalize({ steps: [{ title: "Input" }, { kind: "branch", title: "Hợp lệ?", lanes: [{ title: "no", steps: [{ kind: "end", title: "400" }] }, { title: "yes" }] }, { title: "Save" }] }), { narrow: true, width: 360 });
  const input = L.boxes.find((b) => b.node && b.node.title === "Input");
  for (const l of L.labels) assert.ok(l.y >= input.y + input.h, "label below the box above");
  const lanes = L.boxes.filter((b) => b.lane);
  assert.ok(lanes.every((b, i) => b.subLines.join(" ").includes(`nhánh ${i + 1}/2`)), "lane heads are numbered");
  for (const b of L.boxes) assert.ok(b.x + b.w <= L.width + 0.5);
});
