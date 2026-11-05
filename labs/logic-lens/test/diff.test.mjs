import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const LL = createRequire(import.meta.url)("./load.cjs");
const D = LL.diff;

const OLD = ["function pay(order) {", "  const total = sum(order);", "  if (total > 0) {", "    charge(total);", "  }", "  return total;", "}"].join("\n");
const NEW = ["function pay(order) {", "  const total = sum(order);", "  if (!order.paid && total > 0) {", "    charge(total);", "    order.paid = true;", "  }", "  return total;", "}"].join("\n");

test("compare: added lines, removed lines anchored before the next new line", () => {
  const c = D.compare(OLD, NEW);
  assert.deepEqual([...c.added].sort((a, b) => a - b), [3, 5]);
  assert.deepEqual(c.delAt.get(3), ["  if (total > 0) {"]);
  assert.equal(c.stats.added, 2);
  assert.equal(c.stats.removed, 1);
  const types = c.listing.map((l) => l.type).join("");
  assert.equal(types, "eqeqdeladdeqaddeqeqeq".replace(/eq/g, "e").replace(/add/g, "a").replace(/del/g, "d").split("").map((x) => ({ e: "eq", a: "add", d: "del" }[x])).join(""));
});

test("changeIn classifies a box's range", () => {
  const c = D.compare(OLD, NEW);
  assert.equal(D.changeIn(c, [1, 2]), "");
  assert.equal(D.changeIn(c, [5, 5]), "added");
  assert.equal(D.changeIn(c, [3, 6]), "modified");
  assert.equal(D.changeIn(c, [3, 3]), "modified", "a replaced single line is modified, not added");
});

test("reconcileChanges corrects the model: changed lines are marked, unchanged marks without a note are dropped", () => {
  const c = D.compare(OLD, NEW);
  const flow = LL.flow.normalize({ steps: [
    { title: "Sum", lines: [2, 2], change: "modified" },
    { title: "Guard", lines: [3, 3] },
    { title: "Mark paid", lines: [5, 5], change: "added" },
    { title: "Old check", lines: [3, 3], change: "removed", changeNote: "replaced by the guard" },
  ] });
  const counts = D.reconcileChanges(flow, c);
  assert.equal(flow.steps[0].change, undefined, "no real change and no note");
  assert.equal(flow.steps[1].change, "modified");
  assert.equal(flow.steps[2].change, "added");
  assert.equal(flow.steps[3].change, "removed");
  assert.equal(counts.corrected, 2);
});

test("unified diff: parse, apply forward and in reverse (with drifted line numbers)", () => {
  const patch = ["diff --git a/pay.js b/pay.js", "--- a/pay.js", "+++ b/pay.js", "@@ -2,4 +2,5 @@", "   const total = sum(order);", "-  if (total > 0) {", "+  if (!order.paid && total > 0) {", "     charge(total);", "+    order.paid = true;", "   }"].join("\n");
  assert.ok(D.isUnifiedDiff(patch));
  const files = D.parseUnified(patch);
  assert.equal(files.length, 1);
  assert.equal(files[0].newPath, "pay.js");
  assert.equal(D.applyPatch(OLD, files[0], "forward").code, NEW);
  assert.equal(D.applyPatch(NEW, files[0], "reverse").code, OLD);
  const drifted = "// header\n// another\n" + NEW;
  const back = D.applyPatch(drifted, files[0], "reverse");
  assert.equal(back.failed, 0);
  assert.equal(back.code, "// header\n// another\n" + OLD);
});

test("listing for the prompt marks added lines and shows removed ones without numbers", () => {
  const txt = D.listingForPrompt(D.compare(OLD, NEW));
  assert.ok(txt.includes(" -|   if (total > 0) {"));
  assert.ok(txt.includes("3+|   if (!order.paid && total > 0) {"));
  assert.ok(txt.includes("2 |   const total"));
});

test("big inputs stay fast", () => {
  const a = Array.from({ length: 4000 }, (_, i) => "line " + i);
  const b = a.slice();
  b.splice(1000, 5, "x", "y");
  b.splice(3000, 0, "z");
  const t0 = Date.now();
  const c = D.compare(a.join("\n"), b.join("\n"));
  assert.ok(Date.now() - t0 < 1500);
  assert.equal(c.stats.added, 3);
  assert.equal(c.stats.removed, 5);
});

test("a diff ending in a newline, or with a stripped empty context line, still applies", () => {
  const before = "a\n\nb\nc";
  const diff = "--- a/f\n+++ b/f\n@@ -1,4 +1,4 @@\n a\n\n-b\n+B\n c\n"; // trailing newline + empty context line without its space
  const r = D.applyPatch(before, D.parseUnified(diff)[0], "forward");
  assert.equal(r.failed, 0);
  assert.equal(r.code, "a\n\nB\nc");
  assert.equal(D.applyPatch(r.code, D.parseUnified(diff)[0], "reverse").code, before);
});
