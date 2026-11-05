/* Logic Lens — flow model, text format, normalization, Mermaid export, prompt for Claude.
 * Pure functions: no DOM. Works in the browser and in Node (tests).
 *
 * Model
 *   Flow  = { title, summary, steps: Node[] }
 *   Node  = { kind, title, sub, detail, lines: [from, to] | null, attention, ... }
 *     kind "step"   one action
 *     kind "stage"  a main phase (drawn highlighted)
 *     kind "end"    the path stops here: return / throw / exit (drawn as a pill; its lane does not rejoin)
 *     kind "group"  several things combined in one phase: + items: {title, sub, attention}[], note
 *     kind "loop"   repeated work: + steps: Node[] (the body)
 *     kind "branch" mutually exclusive paths: + lanes: Lane[] (title = the question, optional)
 *   Lane  = { title, sub, detail, lines, attention, steps: Node[] }
 *
 * Text format (2-space indentation)
 *   title: Search RFD
 *   summary: One sentence.
 *   step  Receive parameters | filters, page, view mode   @1-12
 *     > Longer explanation shown when the box is clicked.
 *   stage 1. Build the filter | one "AND ..." per non-NULL parameter   @14-40
 *   warn  Attach files | dashed red box = worth a closer look
 *   group 2. Build FROM
 *     item plm.RFD
 *     item Style | Product + Collection
 *     note Show latest: keep the highest Id per style
 *   loop  For each row | parse and validate
 *     step Parse price
 *   branch Which view mode?
 *     lane Rows
 *       step Count | rows after filtering
 *     lane Invalid !
 *       end Return 400
 *   stage Return result
 *   ("!" at the end of any line marks the box for attention.)
 */
(function (LL) {
  "use strict";

  const KINDS = ["step", "stage", "end", "group", "loop", "branch"];
  const LIMITS = { depth: 4, lanes: 6, items: 8, steps: 40, title: 80, sub: 140, detail: 1200, total: 80 };

  // ───────────────────────── normalize ─────────────────────────

  /** One-line text, cut at a word boundary with "…" when longer than max. */
  const str = (v, max) => {
    if (v == null || typeof v === "object") return "";
    const t = String(v).replace(/\s+/g, " ").trim();
    const m = max || 400;
    if (t.length <= m) return t;
    const cut = t.slice(0, m - 1);
    const sp = cut.lastIndexOf(" ");
    return (sp > m * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:]+$/, "") + "…";
  };
  const longStr = (v, max) => (v == null || typeof v === "object" ? "" : String(v).replace(/\r\n/g, "\n").trim().slice(0, max || 2000));
  const arr = (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? (Array.isArray(v.steps) ? v.steps : [v]) : []);

  /** Parse a line range in any of the shapes a model tends to produce. Returns [a, b] (may be 0-based; fixed later) or null. */
  function lines(v) {
    if (v == null || v === false) return null;
    let a, b;
    if (Array.isArray(v)) [a, b] = v;
    else if (typeof v === "object") { a = v.from != null ? v.from : v.start; b = v.to != null ? v.to : v.end; }
    else if (typeof v === "string") { const m = v.match(/(\d+)\s*(?:[-–:,]\s*(\d+))?/); if (m) { a = m[1]; b = m[2]; } }
    else if (typeof v === "number") a = v;
    a = Math.round(Number(a));
    b = b == null ? a : Math.round(Number(b));
    if (!Number.isFinite(a) || a < 0) return null;
    if (!Number.isFinite(b) || b < a) b = a;
    return [a, b];
  }

  const KIND_ALIASES = {
    warn: "step", attention: "step", note: "step", action: "step", call: "step", process: "step", task: "step", input: "step", output: "step",
    phase: "stage", section: "stage", milestone: "stage",
    exit: "end", return: "end", throw: "end", stop: "end", terminate: "end", raise: "end",
    if: "branch", switch: "branch", fork: "branch", decision: "branch", condition: "branch", match: "branch", case: "branch",
    for: "loop", foreach: "loop", while: "loop", repeat: "loop", iterate: "loop", each: "loop",
    parallel: "group", combine: "group", join: "group", merge: "group",
  };

  /** Make any loosely shaped object (from Claude or hand-written JSON) a valid Flow. */
  function normalize(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const top = Array.isArray(r) ? r : arr(r.steps || r.flow || r.nodes || r.diagram);
    let count = 0;
    let sawZero = false;
    const rng = (v) => {
      const x = lines(v);
      if (x && x[0] === 0) sawZero = true;
      return x;
    };

    const lane = (l, depth, fallbackTitle) => {
      const o = l && typeof l === "object" ? l : { title: l };
      return {
        title: str(o.title || o.label || o.when || o.condition || o.case || o.name, LIMITS.title) || fallbackTitle || "…",
        sub: str(o.sub || o.subtitle, LIMITS.sub),
        detail: longStr(o.detail || o.explanation, LIMITS.detail),
        lines: rng(o.lines || o.range || o.lineRange),
        attention: !!(o.attention || o.warn),
        steps: depth < LIMITS.depth ? arr(o.steps || o.flow || o.nodes || o.body || o.then).map((c) => node(c, depth + 1)).filter(Boolean) : [],
      };
    };

    const node = (n, depth) => {
      if (!n || typeof n !== "object" || count >= LIMITS.total) return null;
      count++;
      let kind = String(n.kind || n.type || "step").toLowerCase().trim();
      let attention = !!(n.attention || n.warn || n.highlight === "warn");
      if (kind === "warn" || kind === "attention") attention = true;
      if (KIND_ALIASES[kind]) kind = KIND_ALIASES[kind];
      if (!KINDS.includes(kind)) kind = "step";
      if (n.end === true || n.exit === true) kind = "end";
      const out = {
        kind,
        title: str(n.title || n.label || n.name || n.question, LIMITS.title),
        sub: str(n.sub || n.subtitle || n.description, LIMITS.sub),
        detail: longStr(n.detail || n.explanation, LIMITS.detail),
        lines: rng(n.lines || n.lineRange || n.range),
        attention,
      };
      if (kind === "group") {
        out.items = arr(n.items || n.children || n.parts).slice(0, LIMITS.items)
          .map((it) => (it && typeof it === "object"
            ? { title: str(it.title || it.label || it.name, LIMITS.title), sub: str(it.sub || it.subtitle, LIMITS.sub), attention: !!(it.attention || it.warn), lines: rng(it.lines || it.range) }
            : { title: str(it, LIMITS.title), sub: "", attention: false, lines: null }))
          .filter((it) => it.title);
        out.note = str(n.note, LIMITS.sub);
      } else if (kind === "loop") {
        out.steps = depth < LIMITS.depth ? arr(n.steps || n.body || n.children || n.flow).map((c) => node(c, depth + 1)).filter(Boolean) : [];
      } else if (kind === "branch") {
        let lanes = n.lanes || n.branches || n.cases || n.paths || n.options;
        if (!lanes && (n.then || n.else || n.yes || n.no)) {
          // if/else shape: {condition, then: [...], else: [...]}
          lanes = [];
          if (n.then || n.yes) lanes.push({ title: str(n.condition || n.if, LIMITS.title) || "Đúng", steps: n.then || n.yes });
          if (n.else || n.no) lanes.push({ title: n.condition ? "Ngược lại" : "Sai", steps: n.else || n.no });
          if (!out.title) out.title = str(n.condition || n.if, LIMITS.title);
        }
        out.lanes = arr(lanes).slice(0, LIMITS.lanes).map((l) => lane(l, depth));
        if (!out.title) out.title = str(n.condition || n.question, LIMITS.title);
        if (!out.lanes.length) { out.kind = "step"; delete out.lanes; }
      }
      if (!out.title && out.kind !== "branch") out.title = "…";
      return out;
    };

    const flow = {
      title: str(r.title, 120),
      summary: longStr(r.summary, 600),
      steps: top.slice(0, LIMITS.steps).map((n) => node(n, 1)).filter(Boolean),
    };
    // a model that numbers lines from 0: shift every range by one
    const fixRange = (r) => (!r ? null : sawZero ? [r[0] + 1, r[1] + 1] : r[0] < 1 ? null : r);
    eachNode(flow, (n) => {
      n.lines = fixRange(n.lines);
      if (n.items) for (const it of n.items) it.lines = fixRange(it.lines);
    });
    markUnreachable(flow);
    return flow;
  }

  const UNREACHABLE = "không bao giờ chạy tới";

  /** Boxes listed after an end box in the same sequence can never run: flag them instead of drawing them as normal steps. */
  function markUnreachable(flow) {
    const visit = (list) => {
      let ended = false;
      for (const n of list) {
        if (ended && !n.unreachable) {
          n.unreachable = true;
          n.attention = true;
          if (!n.sub.startsWith(UNREACHABLE)) n.sub = n.sub ? UNREACHABLE + " · " + n.sub : UNREACHABLE;
        }
        if (n.kind === "end") ended = true;
        if (n.kind === "branch") for (const l of n.lanes) visit(l.steps);
        if (n.kind === "loop") visit(n.steps);
      }
    };
    visit(flow.steps);
  }

  /** Visit every node and lane (not group items). */
  function eachNode(flow, fn) {
    const visit = (list) => {
      for (const n of list) {
        fn(n);
        if (n.kind === "branch") for (const l of n.lanes) { fn(l); visit(l.steps); }
        if (n.kind === "loop") visit(n.steps);
      }
    };
    visit(flow.steps);
  }

  // ───────────────────────── traversal ─────────────────────────

  /**
   * Depth-first list of every clickable box, in reading order, each with a stable id and its place in the structure:
   * {id, node, lane?: true, path: [{lane, laneIndex, laneCount, branchTitle}]}.
   */
  function walkNodes(flow) {
    const out = [];
    const visit = (list, prefix, ctx) => {
      list.forEach((n, i) => {
        const id = prefix + i;
        if (n.kind === "branch") {
          n.lanes.forEach((l, j) => {
            const lid = id + ".l" + j;
            const here = ctx.concat([{ lane: l.title, laneIndex: j, laneCount: n.lanes.length, branchTitle: n.title || "" }]);
            out.push({ id: lid, node: l, lane: true, path: here });
            visit(l.steps, lid + ".", here);
          });
        } else {
          out.push({ id, node: n, path: ctx });
          if (n.kind === "loop") visit(n.steps, id + ".", ctx.concat([{ loop: n.title }]));
        }
      });
    };
    visit(flow.steps, "", []);
    return out;
  }

  function countBoxes(flow) {
    return walkNodes(flow).length;
  }

  /** Does a sequence end the path (its last box is an end, or a branch whose every lane ends)? */
  function endsPath(list) {
    const last = list[list.length - 1];
    if (!last) return false;
    if (last.kind === "end") return true;
    if (last.kind === "branch") return last.lanes.every((l) => endsPath(l.steps));
    return false;
  }

  // ───────────────────────── code helpers ─────────────────────────

  const LANG_HINTS = [
    ["sql", /\b(create\s+(or\s+alter\s+)?proc(edure)?|select\s+.+\s+from|declare\s+@\w+|begin\s+tran|exec\s+sp_|insert\s+into)\b/i],
    ["python", /^\s*(def |class |import |from \w+ import )|:\s*\n\s{4}\S/m],
    ["go", /^\s*(package \w+|func \(?\w)/m],
    ["rust", /\bfn \w+\(|\blet mut\b|impl\b.*\{/],
    ["csharp", /\b(namespace|public\s+(async\s+)?(class|Task|void|static))\b|\busing System\b/],
    ["java", /\bpublic\s+(static\s+)?(class|void|final)\b|@Override/],
    ["php", /<\?php|\$\w+\s*=|function\s+\w+\(\$/],
    ["typescript", /\b(interface|type)\s+\w+\s*[={<]|:\s*(string|number|boolean)\b|\bimport .* from ['"]/],
    ["javascript", /\b(const|let|function|=>|async|await|module\.exports|require\()/],
  ];

  function guessLanguage(code) {
    for (const [name, re] of LANG_HINTS) if (re.test(code)) return name;
    return "code";
  }

  function numberLines(code) {
    const ls = String(code).replace(/\r\n/g, "\n").split("\n");
    const w = String(ls.length).length;
    return ls.map((l, i) => String(i + 1).padStart(w) + "| " + l).join("\n");
  }

  /** Resolve {anchor: [from, to]} text anchors against code into lines (used by the examples). */
  function resolveAnchors(flow, code) {
    const ls = String(code).split("\n");
    const find = (needle, start) => {
      for (let i = Math.max(0, start || 0); i < ls.length; i++) if (ls[i].includes(needle)) return i + 1;
      return null;
    };
    const fix = (n) => {
      if (n.anchor) {
        const a = find(n.anchor[0]);
        const b = n.anchor[1] ? find(n.anchor[1], a ? a - 1 : 0) : a;
        n.lines = a ? [a, b || a] : null;
        delete n.anchor;
      }
      (n.lanes || []).forEach(fix);
      (n.steps || []).forEach(fix);
    };
    flow.steps.forEach(fix);
    return flow;
  }

  LL.flow = Object.assign(LL.flow || {}, { normalize, walkNodes, eachNode, endsPath, countBoxes, guessLanguage, numberLines, resolveAnchors, markUnreachable, LIMITS, KINDS });
  // helpers shared with flow-text.js and prompt.js
  LL.flow._ = { str, longStr, lines };
})(globalThis.LL = globalThis.LL || {});
