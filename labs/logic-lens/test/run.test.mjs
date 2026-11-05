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
  assert.deepEqual(r.seen, ["click", "back"], "a section header is not a step of the run");
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

test("run: 'stay' returns to the dialog, a user action that runs out returns to the page, untitled branches borrow the question", () => {
  const f = F.normalize({ steps: [
    { kind: "start", title: "Open", tag: "USER" },
    { kind: "branch", title: "User does what?", lanes: [
      { title: "Edit", tag: "USER", steps: [
        { kind: "step", title: "Show dialog" },
        { kind: "branch", title: "In the dialog", lanes: [
          { title: "Save", tag: "USER", steps: [
            { kind: "step", title: "Check the price", sub: "price > 0?" },
            { kind: "branch", lanes: [{ title: "no", steps: [{ kind: "end", exit: "stay", title: "error under the field" }] }, { title: "yes", steps: [{ kind: "end", exit: "back", title: "saved" }] }] },
          ] },
          { title: "Cancel", tag: "USER", steps: [{ kind: "end", exit: "back", title: "closed" }] },
        ] },
      ] },
      { title: "Search", tag: "USER", steps: [{ kind: "step", title: "reload list" }] },
      { title: "Add", steps: [{ kind: "end", exit: "navigate", title: "new page" }] },
    ] },
  ] });
  const questions = [];
  const run = LL.flowRun.create(f);
  const seen = [];
  const answers = [0, 0, 0, 0, 1, 0, 1, 1, 2];
  for (let g = 0; g < 80; g++) {
    const r = run.next();
    if (r.done) break;
    if (r.choice) { questions.push(r.choice.question); run.choose(answers.shift()); continue; }
    seen.push(r.node.title);
  }
  assert.deepEqual(seen, ["Open", "Edit", "Show dialog", "Save", "Check the price", "no", "error under the field", "Save", "Check the price", "yes", "saved",
    "Edit", "Show dialog", "Cancel", "closed", "Search", "reload list", "Add", "new page"]);
  assert.equal(questions[2], "price > 0?", "an untitled branch asks the check of the box before it");
  assert.equal(questions[3], "In the dialog", "after 'stay' the dialog's choice comes back");
});

test("run: a UI scenario ends once its picks are used and the user is back on the screen", () => {
  const f = F.normalize({ steps: [
    { kind: "start", title: "Open" },
    { kind: "branch", title: "User does what?", lanes: [{ title: "Delete", steps: [{ kind: "end", exit: "back", title: "row removed" }] }, { title: "Save", steps: [] }, { title: "Save all", steps: [] }] },
  ] });
  const run = LL.flowRun.create(f, { picks: ["Delete"] });
  let r;
  const seen = [];
  for (let g = 0; g < 20 && !(r = run.next()).done; g++) { assert.ok(!r.choice, "never waits"); seen.push(r.node.title); }
  assert.ok(r.scenarioDone);
  assert.deepEqual(seen, ["Open", "Delete", "row removed"]);
  const amb = LL.flowRun.create(f, { picks: ["sav"] });
  amb.next();
  assert.ok(amb.next().choice, "a pick that matches two options is not guessed");
});
