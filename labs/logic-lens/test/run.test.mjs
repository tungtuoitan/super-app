import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const LL = createRequire(import.meta.url)("./load.cjs");
const F = LL.flow;

const flow = F.normalize({ steps: [
  { kind: "start", title: "go" },
  { kind: "branch", lanes: [
    { title: "bad", steps: [{ kind: "end", exit: "throw", title: "boom" }] },
    { title: "ok", steps: [] },
  ] },
  { kind: "loop", title: "each item", steps: [
    { kind: "branch", lanes: [{ title: "skip", steps: [{ kind: "end", exit: "continue", title: "next one" }] }, { title: "use", steps: [{ kind: "step", title: "work" }] }] },
  ] },
  { kind: "parallel", lanes: [{ title: "A", steps: [] }, { title: "B", steps: [] }] },
  { kind: "step", title: "Old", change: "removed" },
  { kind: "end", title: "done" },
] });

/** Run to the end, answering choices from `answers` (indexes); returns the titles walked and the choices met. */
function walk(run, answers) {
  const seen = [];
  const asked = [];
  for (let guard = 0; guard < 100; guard++) {
    const r = run.next();
    if (r.done) return { seen, asked, end: r.end && r.end.title };
    if (r.choice) { asked.push(r.choice.kind + ":" + r.choice.options.join("/")); run.choose(answers.shift()); continue; }
    seen.push(r.node.title);
  }
  throw new Error("did not finish");
}

test("run: a branch asks, the chosen lane is walked, an end stops the run", () => {
  const r = walk(LL.flowRun.create(flow), [0]);
  assert.deepEqual(r.seen, ["go", "bad", "boom"]);
  assert.equal(r.end, "boom");
});

test("run: loops ask to go round again, continue skips to that question, parallel walks every lane, removed boxes are skipped", () => {
  const r = walk(LL.flowRun.create(flow), [1, 0, 0, 1, 1]);
  assert.deepEqual(r.seen, ["go", "ok", "each item", "skip", "next one", "use", "work", "A", "B", "done"]);
  assert.deepEqual(r.asked, ["branch:bad/ok", "branch:skip/use", "loop:Lặp lại lần nữa/Thoát vòng lặp", "branch:skip/use", "loop:Lặp lại lần nữa/Thoát vòng lặp"]);
  assert.equal(r.end, "done");
});

test("run: a scenario follows its picks by lane title and runs loops once", () => {
  const run = LL.flowRun.create(flow, { picks: ["OK", "use"] });
  const r = walk(run, []);
  assert.deepEqual(r.asked, []);
  assert.deepEqual(r.seen, ["go", "ok", "each item", "use", "work", "A", "B", "done"]);
});

test("run: several sections ask where to start", () => {
  const f = F.normalize({ steps: [
    { kind: "section", title: "On load", steps: [{ kind: "start", title: "load" }] },
    { kind: "section", title: "On click", steps: [{ kind: "start", title: "click" }, { kind: "end", exit: "back", title: "back" }] },
  ] });
  const r = walk(LL.flowRun.create(f), [1]);
  assert.deepEqual(r.asked, ["section:On load/On click"]);
  assert.deepEqual(r.seen, ["On click", "click", "back"]);
});

test("run: 'back' returns to the user's choice on the same screen", () => {
  const f = F.normalize({ steps: [
    { kind: "start", title: "Open the page", tag: "USER" },
    { kind: "branch", title: "User does what?", lanes: [
      { title: "Edit", steps: [{ kind: "branch", lanes: [{ title: "Save", steps: [{ kind: "end", exit: "back", title: "saved" }] }, { title: "Cancel", steps: [{ kind: "end", exit: "back", title: "closed" }] }] }] },
      { title: "Add", steps: [{ kind: "end", exit: "navigate", title: "new page" }] },
    ] },
  ] });
  const r = walk(LL.flowRun.create(f), [0, 1, 0, 0, 1]);
  assert.deepEqual(r.seen, ["Open the page", "Edit", "Cancel", "closed", "Edit", "Save", "saved", "Add", "new page"]);
  assert.equal(r.asked.filter((a) => a.startsWith("branch:Edit/Add")).length, 3, "asked again after each 'back'");
  assert.equal(r.end, "new page");
});
