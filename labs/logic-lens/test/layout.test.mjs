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
      const parentChild = (a.kind === "group" && b.groupId === a.id) || (b.kind === "group" && a.groupId === b.id);
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
