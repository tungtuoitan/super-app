import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const LL = createRequire(import.meta.url)("./load.cjs");
const F = LL.flow;

const allNodes = (flow) => F.walkNodes(flow).map((x) => x.node);

test("every example resolves every line anchor", () => {
  for (const ex of LL.sample.EXAMPLES) {
    const { flow, code } = LL.sample.getExample(ex.id);
    const n = code.split("\n").length;
    for (const node of allNodes(flow)) {
      assert.ok(node.lines, `${ex.id}: “${node.title}” has no lines`);
      assert.ok(node.lines[0] >= 1 && node.lines[1] <= n && node.lines[0] <= node.lines[1], `${ex.id}: “${node.title}” lines ${node.lines}`);
    }
  }
});

test("text format round-trips every example", () => {
  for (const ex of LL.sample.EXAMPLES) {
    const { flow } = LL.sample.getExample(ex.id);
    const text = F.toText(flow);
    const back = F.parseText(text);
    assert.deepEqual(back.errors, [], ex.id + " " + JSON.stringify(back.errors));
    assert.deepEqual(back.flow, flow, ex.id);
  }
});

test("text format parses the documented syntax", () => {
  const { flow, errors } = F.parseText(`title: Demo
summary: A small one.
step Nhận tham số | bộ lọc   @1-3
  > First line.
  > Second line.
stage 1. Ghép | AND
warn Careful | look here
group 2. FROM   @4
  item plm.RFD
  item Style | Product
  note keep latest
branch
  lane A !
    step a1
  lane B | sub b
step End
`);
  assert.deepEqual(errors, []);
  assert.equal(flow.title, "Demo");
  assert.equal(flow.steps.length, 6);
  assert.deepEqual(flow.steps[0].lines, [1, 3]);
  assert.equal(flow.steps[0].detail, "First line.\nSecond line.");
  assert.equal(flow.steps[2].attention, true);
  assert.equal(flow.steps[3].items.length, 2);
  assert.equal(flow.steps[3].note, "keep latest");
  assert.equal(flow.steps[4].lanes.length, 2);
  assert.equal(flow.steps[4].lanes[0].attention, true);
  assert.equal(flow.steps[4].lanes[1].sub, "sub b");
  assert.equal(flow.steps[4].lanes[0].steps[0].title, "a1");
});

test("text format reports mistakes with line numbers", () => {
  const { errors } = F.parseText("step ok\nfoo bar\nitem x\nbranch\n  step y\n");
  assert.deepEqual(errors.map((e) => e.line), [2, 3, 5, 0]);
});

test("normalize accepts loose shapes from a model", () => {
  const f = F.normalize({ title: "x", flow: [
    { type: "warn", label: "Careful", lines: "12-20" },
    { kind: "if", branches: [{ condition: "yes", steps: [{ title: "a" }] }, { label: "no", flow: [] }] },
    { kind: "group", children: ["t1", { label: "t2", subtitle: "s" }] },
    { kind: "weird", title: "falls back to step", lines: { start: 5, end: 3 } },
    { kind: "branch", lanes: [] },
    null,
  ] });
  assert.equal(f.steps[0].attention, true);
  assert.deepEqual(f.steps[0].lines, [12, 20]);
  assert.equal(f.steps[1].kind, "branch");
  assert.equal(f.steps[1].lanes[0].title, "yes");
  assert.equal(f.steps[2].items[1].sub, "s");
  assert.equal(f.steps[3].kind, "step");
  assert.deepEqual(f.steps[3].lines, [5, 5]);
  assert.equal(f.steps[4].kind, "step", "an empty branch degrades to a step");
  assert.equal(f.steps.length, 5);
});

test("parseReply finds JSON in fenced or chatty replies, or the text format", () => {
  const json = JSON.stringify({ title: "t", steps: [{ kind: "step", title: "a" }] });
  assert.equal(F.parseReply(json).flow.steps.length, 1);
  assert.equal(F.parseReply("Here you go:\n```json\n" + json + "\n```\nDone.").flow.title, "t");
  assert.equal(F.parseReply("Sure! " + json).flow.steps[0].title, "a");
  assert.equal(F.parseReply("step One\nstep Two").flow.steps.length, 2);
  assert.ok(F.parseReply("nothing here").error);
});

test("prompt numbers the code and asks for the chosen language", () => {
  const p = F.buildPrompt("a\nb\nc", { language: "vi", detail: "simple" });
  assert.ok(p.includes("1| a\n2| b\n3| c"));
  assert.ok(p.includes("in Vietnamese"));
  assert.ok(p.includes("At most 10 boxes in total") && p.includes("4 to 7 boxes at the top level"));
  assert.ok(F.buildPrompt("x", { language: "en" }).includes("in English"));
});

test("guessLanguage", () => {
  assert.equal(F.guessLanguage(LL.sample.EXAMPLES[0].code), "sql");
  assert.equal(F.guessLanguage(LL.sample.EXAMPLES[1].code), "javascript");
  assert.equal(F.guessLanguage(LL.sample.EXAMPLES[2].code), "python");
});

test("walkNodes ids match the layout box ids", () => {
  for (const ex of LL.sample.EXAMPLES) {
    const { flow } = LL.sample.getExample(ex.id);
    const ids = F.walkNodes(flow).map((x) => x.id).sort();
    const lay = LL.layout.layout(flow);
    const boxIds = lay.boxes.filter((b) => b.kind !== "item").map((b) => b.id).sort();
    assert.deepEqual(boxIds, ids, ex.id);
  }
});

test("mermaid export lists every box and edge", () => {
  const { flow } = LL.sample.getExample("sql");
  const m = F.toMermaid(flow);
  assert.ok(m.startsWith("flowchart TD"));
  assert.equal((m.match(/\]\s*$/gm) || []).length, F.countBoxes(flow) - 0, "one node line per box (group counted once)");
  assert.ok(m.includes("-->"));
  assert.ok(m.includes("class ") && m.includes(" attention"));
});

test("normalize: if/then/else, loops, exits, object-valued steps, 0-based lines", () => {
  const f = F.normalize({ steps: [
    { kind: "if", condition: "cart empty?", then: [{ kind: "return", title: "400" }], else: [{ title: "go on" }] },
    { kind: "for", title: "each row", body: [{ title: "parse" }] },
    { kind: "branch", lanes: [{ title: "A", steps: { kind: "step", title: "single object" } }] },
    { kind: "step", title: "x", lines: [0, 3] },
  ] });
  assert.equal(f.steps[0].kind, "branch");
  assert.equal(f.steps[0].title, "cart empty?");
  assert.equal(f.steps[0].lanes.length, 2);
  assert.equal(f.steps[0].lanes[0].steps[0].kind, "end");
  assert.equal(f.steps[1].kind, "loop");
  assert.equal(f.steps[1].steps[0].title, "parse");
  assert.equal(f.steps[2].lanes[0].steps[0].title, "single object");
  assert.deepEqual(f.steps[3].lines, [1, 4], "0-based ranges are shifted to 1-based");
});

test("text format handles loop and end, and round-trips them", () => {
  const src = "loop  For each row | parse\n  step  Parse price\n  end   Bad row | stop\nbranch Valid?\n  lane  no !\n    end   Throw\n  lane  yes\nstep  Save\n";
  const { flow, errors } = F.parseText(src);
  assert.deepEqual(errors, []);
  assert.equal(flow.steps[0].kind, "loop");
  assert.equal(flow.steps[0].steps.length, 2);
  assert.equal(flow.steps[1].title, "Valid?");
  assert.equal(flow.steps[1].lanes[0].steps[0].kind, "end");
  assert.deepEqual(F.parseText(F.toText(flow)).flow, flow);
});

test("endsPath: a lane that returns does not continue", () => {
  assert.equal(F.endsPath([{ kind: "step" }, { kind: "end" }]), true);
  assert.equal(F.endsPath([{ kind: "branch", lanes: [{ steps: [{ kind: "end" }] }, { steps: [] }] }]), false);
  assert.equal(F.endsPath([{ kind: "branch", lanes: [{ steps: [{ kind: "end" }] }, { steps: [{ kind: "end" }] }] }]), true);
});

test("mermaid: ends are stadium shapes, loops are subgraphs, fork edges carry the question", () => {
  const f = F.normalize({ steps: [{ title: "in" }, { kind: "branch", title: "ok?", lanes: [{ title: "no", steps: [{ kind: "end", title: "stop" }] }, { title: "yes" }] }, { kind: "loop", title: "each", steps: [{ title: "work" }] }, { title: "out" }] });
  const m = F.toMermaid(f);
  assert.ok(/\(\[".*stop.*"\]\)/.test(m), m);
  assert.ok(m.includes("subgraph"));
  assert.ok(m.includes('-- "ok?" -->'));
  // the "no" lane ends: no edge from the end box to the loop
  const endId = m.match(/(n\d+)\(\[/)[1];
  assert.ok(!new RegExp(endId + " -->").test(m), "an end box has no outgoing edge");
});
