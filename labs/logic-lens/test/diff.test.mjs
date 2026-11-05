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
  assert.equal(flow.steps[1].change, "added", "the old check is shown by its own removed box");
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

test("a removed SQL comment ('--- …' inside a hunk) is content, not a new file header", () => {
  const before = "SELECT 1;\n-- old comment\nSELECT 2;\nSELECT 3;";
  const diff = "diff --git a/p.sql b/p.sql\n--- a/p.sql\n+++ b/p.sql\n@@ -1,4 +1,3 @@\n SELECT 1;\n--- old comment\n SELECT 2;\n-SELECT 3;\n+SELECT 4;\n";
  const files = D.parseUnified(diff);
  assert.equal(files.length, 1);
  assert.equal(D.applyPatch(before, files[0], "forward").code, "SELECT 1;\nSELECT 2;\nSELECT 4;");
});

test("change marks: comments and trailing spaces do not count, new code after a deletion stays 'added'", () => {
  const before = "function f(x) {\n  // old note\n  if (x) {\n    save(x);\n  }\n  return x;\n}";
  const after = "function f(x) {\n  // new note\n  if (!x) return null;\n  if (x) {\n    save(x);   \n  }\n  return x;\n}";
  const c = D.compare(before, after);
  assert.equal(D.changeIn(c, [2, 2]), "", "comment-only edit");
  assert.equal(D.changeIn(c, [5, 5]), "", "trailing spaces only");
  assert.equal(D.changeIn(c, [3, 3]), "added", "a new guard right after a removed comment");
  const tail = D.compare("a()\nb()\nc()", "a()\nb()");
  assert.equal(D.changeIn(tail, [2, 2]), "modified", "lines removed at the end belong to the last box");
  assert.equal(D.listingFor(tail, [2, 2]).filter((l) => l.type === "del").length, 1);
  assert.equal(D.listingFor(tail, [1, 1]).filter((l) => l.type === "del").length, 0);
});

test("webhook bug fix: the new guard stays 'added', the edited call is 'modified' and owns the removed lines", () => {
  const fs = createRequire(import.meta.url)("node:fs");
  const read = (f) => fs.readFileSync(new URL("./corpus/" + f, import.meta.url), "utf8");
  const cmp = D.compare(read("changes/webhook.before.js"), read("changes/webhook.after.js"));
  const flow = LL.flow.normalize(JSON.parse(read("out/change-webhook.json")));
  D.reconcileChanges(flow, cmp);
  const by = {};
  LL.flow.eachNode(flow, (n) => { by[n.title] = n; });
  assert.equal(by["Lần đầu"].change, undefined, "the existing path through a new branch is not new");
  const dels = (n) => D.listingFor(cmp, n.lines).filter((l) => l.type === "del").length;
  assert.equal(dels(by["Đã paid"]), 0, "a new box shows no removed lines");
  assert.ok(dels(by["db.tx: paid và giữ kho"]) >= 2, "the edited call shows the lines it replaced");
  assert.equal(by["200 already paid"].change, "added");
  assert.equal(by["db.tx: paid và giữ kho"].change, "modified");
  assert.equal(by["Kiểm tra chữ ký"].change, undefined);
});

test("language-aware comments: '--n;', '*p = 0;' and '#[cfg]' are code; a Python dedent is a change", () => {
  const c1 = D.compare("while (n) {\n  work();\n  --n;\n}", "while (n) {\n  work();\n}");
  assert.equal(D.changeIn(c1, [1, 3]), "modified");
  const c2 = D.compare("void f(int *p) {\n}", "void f(int *p) {\n  *p = 0;\n}");
  assert.equal(D.changeIn(c2, [2, 2]), "added");
  const c3 = D.compare("fn main() {}\nmod tests {}", "fn main() {}\n#[cfg(test)]\nmod tests {}");
  assert.equal(D.changeIn(c3, [2, 2]), "added");
  const c4 = D.compare("def total(xs):\n    s = 0\n    for x in xs:\n        s += x\n        return s", "def total(xs):\n    s = 0\n    for x in xs:\n        s += x\n    return s");
  assert.ok(c4.stats.changed, "dedent seen");
  assert.equal(D.changeIn(c4, [5, 5]), "modified");
  const c5 = D.compare("def f():\n    # old\n    return 2", "def f():\n    # new\n    return 2");
  assert.equal(D.changeIn(c5, [1, 3]), "", "a Python comment edit");
  const c6 = D.compare("SELECT a FROM t;\n-- old\nSELECT 2;", "SELECT a FROM t;\n-- new\nSELECT 2;");
  assert.equal(D.changeIn(c6, [1, 3]), "", "a SQL comment edit");
});
