/* Logic Lens — code-change support: line diff, unified-diff parsing/applying, and marking which boxes a change touched.
 * Pure functions: no DOM.
 *
 * A "merged listing" is the new code with the removed lines put back where they used to be:
 *   [{type: "eq"|"add"|"del", text, newLine (eq/add: its line in the new code; del: the new line it sits before), oldLine}]
 * Every box's line range is in new-code numbering; a removed box points at the place it used to be.
 */
(function (LL) {
  "use strict";

  const splitLines = (s) => String(s || "").replace(/\r\n/g, "\n").split("\n");

  /** Myers diff on line arrays. Returns ops [{type, a, b}] where a/b are 0-based indexes (a for eq/del, b for eq/add). */
  function diffLines(A, B) {
    const N = A.length;
    const M = B.length;
    const max = N + M;
    const V = new Map([[1, 0]]);
    const trace = [];
    outer: for (let d = 0; d <= max; d++) {
      trace.push(new Map(V));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && (V.get(k - 1) ?? -1) < (V.get(k + 1) ?? -1)) ? V.get(k + 1) ?? 0 : (V.get(k - 1) ?? 0) + 1;
        let y = x - k;
        while (x < N && y < M && A[x] === B[y]) { x++; y++; }
        V.set(k, x);
        if (x >= N && y >= M) break outer;
      }
      if (d > 4000) return fallbackDiff(A, B); // pathological input: give up on minimality
    }
    // backtrack
    const ops = [];
    let x = N;
    let y = M;
    for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
      const Vd = trace[d];
      const k = x - y;
      const prevK = k === -d || (k !== d && (Vd.get(k - 1) ?? -1) < (Vd.get(k + 1) ?? -1)) ? k + 1 : k - 1;
      const prevX = Vd.get(prevK) ?? 0;
      const prevY = prevX - prevK;
      while (x > prevX && y > prevY) { ops.push({ type: "eq", a: x - 1, b: y - 1 }); x--; y--; }
      if (d > 0) {
        if (x === prevX) ops.push({ type: "add", b: y - 1 });
        else ops.push({ type: "del", a: x - 1 });
      }
      x = prevX;
      y = prevY;
    }
    return ops.reverse();
  }

  function fallbackDiff(A, B) {
    // trim the common prefix/suffix, mark the middle as replaced
    let p = 0;
    while (p < A.length && p < B.length && A[p] === B[p]) p++;
    let s = 0;
    while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
    const ops = [];
    for (let i = 0; i < p; i++) ops.push({ type: "eq", a: i, b: i });
    for (let i = p; i < A.length - s; i++) ops.push({ type: "del", a: i });
    for (let j = p; j < B.length - s; j++) ops.push({ type: "add", b: j });
    for (let i = 0; i < s; i++) ops.push({ type: "eq", a: A.length - s + i, b: B.length - s + i });
    return ops;
  }

  /** Compare two versions. Returns {listing, added: Set(newLine), delAt: Map(newLine -> [old texts]), stats}. */
  function compare(oldCode, newCode) {
    const A = splitLines(oldCode);
    const B = splitLines(newCode);
    const ops = diffLines(A, B);
    const listing = [];
    const added = new Set();
    const delAt = new Map();
    let nextNew = 1;
    // removed lines sit before the next surviving new line
    const pendingDel = [];
    const flush = (at) => {
      if (!pendingDel.length) return;
      delAt.set(at, (delAt.get(at) || []).concat(pendingDel.map((d) => d.text)));
      for (const d of pendingDel) listing.push({ type: "del", text: d.text, oldLine: d.oldLine, newLine: at });
      pendingDel.length = 0;
    };
    for (const op of ops) {
      if (op.type === "del") { pendingDel.push({ text: A[op.a], oldLine: op.a + 1 }); continue; }
      flush(nextNew);
      if (op.type === "eq") listing.push({ type: "eq", text: B[op.b], newLine: op.b + 1, oldLine: op.a + 1 });
      else { listing.push({ type: "add", text: B[op.b], newLine: op.b + 1 }); added.add(op.b + 1); }
      nextNew = op.b + 2;
    }
    flush(nextNew);
    const removed = listing.filter((l) => l.type === "del").length;
    return { listing, added, delAt, stats: { added: added.size, removed, changed: added.size + removed > 0 } };
  }

  /**
   * Which kind of change touched new-code lines [a, b]: "added" (all new), "modified" (some change), or "".
   * Removed lines sitting right before line a count only when line a itself is new (a replacement);
   * otherwise they belong to the box above.
   */
  function changeIn(cmp, range) {
    if (!cmp || !range) return "";
    const [a, b] = range;
    let addedCount = 0;
    let deletedInside = false;
    for (let l = a; l <= b; l++) {
      if (cmp.added.has(l)) addedCount++;
      if (l > a && cmp.delAt.has(l)) deletedInside = true;
    }
    const replaced = cmp.delAt.has(a) && cmp.added.has(a);
    if (addedCount === b - a + 1 && !deletedInside && !replaced) return "added";
    if (addedCount || deletedInside || replaced) return "modified";
    return "";
  }

  /**
   * Make the change marks agree with the actual diff: a box whose lines changed is at least "modified" even when
   * the model said it did not; a box marked changed whose lines did not change keeps the model's mark only if it
   * has a change note (a removed box, a behavior change explained elsewhere). Returns counts.
   */
  function reconcileChanges(flow, cmp) {
    const counts = { added: 0, modified: 0, removed: 0, corrected: 0 };
    const visit = (n) => {
      if (n.change === "removed") { counts.removed++; return; }
      const real = changeIn(cmp, n.lines);
      if (real && !n.change) { n.change = real; n.changeAuto = true; counts.corrected++; }
      else if (!real && n.change && !n.changeNote) { delete n.change; counts.corrected++; }
      if (n.change === "added" && real === "modified") n.change = "modified";
      if (n.change) counts[n.change]++;
    };
    LL.flow.eachNode(flow, visit);
    LL.flow.eachNode(flow, (n) => { if (n.items) for (const it of n.items) { const real = changeIn(cmp, it.lines); if (real && !it.change) it.change = real; } });
    return counts;
  }

  /** The merged listing in the shape sent to Claude: new line numbers, "+" for added, "-" for removed (no number). */
  function listingForPrompt(cmp) {
    const w = String(cmp.listing.reduce((m, l) => Math.max(m, l.newLine || 0), 0)).length;
    return cmp.listing.map((l) => {
      if (l.type === "del") return " ".repeat(w) + "-| " + l.text;
      return String(l.newLine).padStart(w) + (l.type === "add" ? "+| " : " | ") + l.text;
    }).join("\n");
  }

  /** The listing entries that belong to a box: its new lines plus removed lines inside or right before it. */
  function listingFor(cmp, range) {
    if (!cmp || !range) return [];
    const [a, b] = range;
    return cmp.listing.filter((l) => l.newLine >= a && l.newLine <= b);
  }

  // ───────────────────────── unified diff ─────────────────────────

  /** Parse a unified diff (git diff). Returns [{oldPath, newPath, hunks: [{oldStart, newStart, lines: [{t: " "|"+"|"-", text}]}]}]. */
  function parseUnified(text) {
    const files = [];
    let file = null;
    let hunk = null;
    for (const line of splitLines(text)) {
      if (line.startsWith("diff --git ")) { file = null; hunk = null; continue; }
      if (line.startsWith("--- ")) {
        file = { oldPath: line.slice(4).replace(/^a\//, "").trim(), newPath: "", hunks: [] };
        files.push(file);
        hunk = null;
        continue;
      }
      if (line.startsWith("+++ ") && file && !hunk) { file.newPath = line.slice(4).replace(/^b\//, "").trim(); continue; }
      const h = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (h) {
        if (!file) { file = { oldPath: "", newPath: "", hunks: [] }; files.push(file); }
        hunk = { oldStart: +h[1], newStart: +h[3], oldLeft: h[2] == null ? 1 : +h[2], newLeft: h[4] == null ? 1 : +h[4], lines: [] };
        file.hunks.push(hunk);
        continue;
      }
      if (!hunk || (hunk.oldLeft <= 0 && hunk.newLeft <= 0)) continue; // a hunk ends when its line counts are used up
      if (line.startsWith("\\")) continue; // "\ No newline at end of file"
      const t = line === "" ? " " : line[0]; // some tools strip the space of an empty context line
      if (t !== " " && t !== "+" && t !== "-") continue;
      hunk.lines.push({ t, text: line.slice(1) });
      if (t !== "+") hunk.oldLeft--;
      if (t !== "-") hunk.newLeft--;
    }
    return files.filter((f) => f.hunks.length);
  }

  /** Does the text look like a unified diff? */
  function isUnifiedDiff(text) {
    return /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/m.test(String(text || ""));
  }

  /**
   * Apply a parsed file diff to `code`. direction "forward": old -> new; "reverse": new -> old.
   * Hunks are located by their context (with drift), so slightly different line numbers still apply.
   * Returns {code, applied, failed}.
   */
  function applyPatch(code, fileDiff, direction) {
    const lines = splitLines(code);
    const rev = direction === "reverse";
    let offset = 0;
    let applied = 0;
    let failed = 0;
    for (const h of fileDiff.hunks) {
      const from = h.lines.filter((l) => l.t === " " || l.t === (rev ? "+" : "-")).map((l) => l.text);
      const to = h.lines.filter((l) => l.t === " " || l.t === (rev ? "-" : "+")).map((l) => l.text);
      const hint = (rev ? h.newStart : h.oldStart) - 1 + offset;
      const at = findBlock(lines, from, hint);
      if (at < 0) { failed++; continue; }
      lines.splice(at, from.length, ...to);
      offset += to.length - from.length;
      applied++;
    }
    return { code: lines.join("\n"), applied, failed };
  }

  function findBlock(lines, block, hint) {
    if (!block.length) return Math.max(0, Math.min(lines.length, hint));
    const matches = (i) => { for (let j = 0; j < block.length; j++) if (lines[i + j] !== block[j]) return false; return true; };
    for (let d = 0; d < lines.length; d++) {
      for (const i of [hint - d, hint + d]) if (i >= 0 && i + block.length <= lines.length && matches(i)) return i;
    }
    // whitespace-insensitive second pass
    const norm = (s) => String(s).trim();
    const nb = block.map(norm);
    for (let i = 0; i + block.length <= lines.length; i++) {
      let ok = true;
      for (let j = 0; j < nb.length && ok; j++) if (norm(lines[i + j]) !== nb[j]) ok = false;
      if (ok) return i;
    }
    return -1;
  }

  LL.diff = { splitLines, diffLines, compare, changeIn, reconcileChanges, listingForPrompt, listingFor, parseUnified, isUnifiedDiff, applyPatch };
})(globalThis.LL = globalThis.LL || {});
