/* Logic Lens — flow model, text format, normalization, Mermaid export, prompt for Claude.
 * Pure functions: no DOM. Works in the browser and in Node (tests).
 *
 * Model
 *   Flow  = { title, summary, steps: Node[] }
 *   Node  = { kind, title, sub, detail, lines: [from, to] | null, attention, tag, ... }
 *     kind "start"    an entry point: the request, event, call or schedule that starts the flow
 *     kind "step"     one action
 *     kind "call"     a call into another function / service (drawn as a subroutine box)
 *     kind "stage"    a main phase (drawn highlighted)
 *     kind "end"      the path stops here: + exit: return | throw | break | continue | exit | respond | navigate
 *                     (drawn as a pill; its lane does not rejoin)
 *     kind "group"    several things combined in one phase: + items: {title, sub, attention, lines}[], note
 *     kind "loop"     repeated work: + steps: Node[] (the body)
 *     kind "branch"   mutually exclusive paths: + lanes: Lane[] (title = the question, optional)
 *     kind "parallel" paths that all run at the same time and are awaited together: + lanes: Lane[]
 *     kind "section"  top level only: an independent entry point of the same code (a handler, an effect, an endpoint)
 *                     + steps: Node[]; sections are not connected to each other
 *   tag: a short label for an external effect: DB, API, FILE, QUEUE, CACHE, UI, EMAIL, AI, LOG…
 *   change / changeNote (code-change view): "added" | "modified" | "removed" and what changed and why.
 *     A removed box stays in the diagram where it used to be, drawn faded and struck through.
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

  const KINDS = ["start", "step", "call", "stage", "end", "group", "loop", "branch", "parallel", "section"];
  const EXITS = ["return", "throw", "break", "continue", "exit", "respond", "navigate"];
  /** Kinds that hold lanes / child steps. */
  const LANED = { branch: 1, parallel: 1 };
  const NESTED = { loop: 1, section: 1 };
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
    warn: "step", attention: "step", note: "step", action: "step", process: "step", task: "step", output: "step",
    entry: "start", trigger: "start", input: "start", event: "start", begin: "start", request: "start", handler: "start",
    invoke: "call", subroutine: "call", function: "call",
    phase: "stage", milestone: "stage",
    stop: "end", terminate: "end", raise: "end", finish: "end", done: "end",
    if: "branch", switch: "branch", fork: "branch", decision: "branch", condition: "branch", match: "branch", case: "branch",
    for: "loop", foreach: "loop", while: "loop", repeat: "loop", iterate: "loop", each: "loop", retry: "loop",
    concurrent: "parallel", all: "parallel", "promise.all": "parallel", fanout: "parallel",
    combine: "group", join: "group", merge: "group",
    entrypoint: "section", method: "section", endpoint: "section", effect: "section",
  };
  // kind words that also say how a path stops
  const EXIT_KINDS = { exit: "exit", return: "return", throw: "throw", raise: "throw", break: "break", continue: "continue", respond: "respond", reject: "throw", navigate: "navigate", redirect: "navigate" };

  const CHANGES = { added: "added", add: "added", new: "added", modified: "modified", changed: "modified", modify: "modified", updated: "modified", fixed: "modified", removed: "removed", deleted: "removed", remove: "removed", delete: "removed" };
  /** Copy change marks from a loose object onto a normalized one. */
  function changeOf(src, out) {
    const c = CHANGES[String(src.change || src.status || src.diff || "").toLowerCase().trim()];
    if (c) out.change = c;
    const note = longStr(src.changeNote || src.change_note || src.why || src.changeReason, 600);
    if (note && c) out.changeNote = note;
    return out;
  }

  /** A short uppercase label for an external effect (DB, API…), or "". */
  function tagOf(v) {
    if (v == null || typeof v === "object") return "";
    const t = String(v).trim().toUpperCase().replace(/[^A-Z0-9_ /-]/g, "").slice(0, 10).trim();
    return t;
  }

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
      return changeOf(o, {
        title: str(o.title || o.label || o.when || o.condition || o.case || o.name, LIMITS.title) || fallbackTitle || "…",
        sub: str(o.sub || o.subtitle, LIMITS.sub),
        detail: longStr(o.detail || o.explanation, LIMITS.detail),
        lines: rng(o.lines || o.range || o.lineRange),
        attention: !!(o.attention || o.warn),
        steps: depth < LIMITS.depth ? arr(o.steps || o.flow || o.nodes || o.body || o.then).map((c) => node(c, depth + 1)).filter(Boolean) : [],
      });
    };

    const node = (n, depth) => {
      if (!n || typeof n !== "object" || count >= LIMITS.total) return null;
      count++;
      let kind = String(n.kind || n.type || "step").toLowerCase().trim();
      let attention = !!(n.attention || n.warn || n.highlight === "warn");
      if (kind === "warn" || kind === "attention") attention = true;
      let exit = EXIT_KINDS[kind] || "";
      if (exit) kind = "end";
      if (KIND_ALIASES[kind]) kind = KIND_ALIASES[kind];
      if (!KINDS.includes(kind)) kind = "step";
      if (n.end === true || n.exit === true) kind = "end";
      if (kind === "section" && depth > 1) kind = "stage"; // sections only exist at the top level
      const out = {
        kind,
        title: str(n.title || n.label || n.name || n.question, LIMITS.title),
        sub: str(n.sub || n.subtitle || n.description, LIMITS.sub),
        detail: longStr(n.detail || n.explanation, LIMITS.detail),
        lines: rng(n.lines || n.lineRange || n.range),
        attention,
      };
      const tag = tagOf(n.tag || n.effect || n.io);
      if (tag) out.tag = tag;
      changeOf(n, out);
      if (kind === "end") {
        const e = String(n.exit && n.exit !== true ? n.exit : n.how || exit || "return").toLowerCase();
        out.exit = EXITS.includes(e) ? e : EXIT_KINDS[e] || "return";
      }
      if (kind === "group") {
        out.items = arr(n.items || n.children || n.parts).slice(0, LIMITS.items)
          .map((it) => (it && typeof it === "object"
            ? changeOf(it, { title: str(it.title || it.label || it.name, LIMITS.title), sub: str(it.sub || it.subtitle, LIMITS.sub), attention: !!(it.attention || it.warn), lines: rng(it.lines || it.range) })
            : { title: str(it, LIMITS.title), sub: "", attention: false, lines: null }))
          .filter((it) => it.title);
        out.note = str(n.note, LIMITS.sub);
      } else if (NESTED[kind]) {
        out.steps = depth < LIMITS.depth ? arr(n.steps || n.body || n.children || n.flow || n.nodes).map((c) => node(c, kind === "section" ? 1 : depth + 1)).filter(Boolean) : [];
      } else if (LANED[kind]) {
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
      if (!out.title && !LANED[out.kind]) out.title = "…";
      return out;
    };

    // a flow given as {sections: [...]} instead of steps
    const topList = top.length ? top : arr(r.sections || r.entryPoints || r.handlers).map((x) => Object.assign({ kind: "section" }, x));
    const flow = {
      title: str(r.title, 120),
      summary: longStr(r.summary, 600),
      steps: topList.slice(0, LIMITS.steps).map((n) => node(n, 1)).filter(Boolean),
    };
    const cs = longStr(r.changeSummary || r.change_summary || r.changeSummaryText, 800);
    if (cs) flow.changeSummary = cs;
    // a section may only sit at the top level: a section nested in a section becomes a stage
    for (const n of flow.steps) if (n.kind === "section") for (const c of n.steps) if (c.kind === "section") c.kind = "stage";
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
        if (n.change === "removed") continue; // a removed box is history, not part of the running flow
        if (ended && !n.unreachable) {
          n.unreachable = true;
          n.attentionOwn = n.attention; // remember whether the attention mark was the author's own
          n.attention = true;
          if (!n.sub.startsWith(UNREACHABLE)) n.sub = n.sub ? UNREACHABLE + " · " + n.sub : UNREACHABLE;
        }
        if (n.kind === "end") ended = true;
        if (LANED[n.kind]) for (const l of n.lanes) visit(l.steps);
        if (NESTED[n.kind]) visit(n.steps);
      }
    };
    // sections are independent entry points: an end in one does not make the next unreachable
    const top = [];
    for (const n of flow.steps) {
      if (n.kind === "section") { visit(n.steps); continue; }
      top.push(n);
    }
    visit(top);
  }

  /** Visit every node and lane (not group items). */
  function eachNode(flow, fn) {
    const visit = (list) => {
      for (const n of list) {
        fn(n);
        if (LANED[n.kind]) for (const l of n.lanes) { fn(l); visit(l.steps); }
        if (NESTED[n.kind]) visit(n.steps);
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
        if (LANED[n.kind]) {
          n.lanes.forEach((l, j) => {
            const lid = id + ".l" + j;
            const here = ctx.concat([{ lane: l.title, laneIndex: j, laneCount: n.lanes.length, branchTitle: n.title || "", parallel: n.kind === "parallel" }]);
            out.push({ id: lid, node: l, lane: true, parallel: n.kind === "parallel", path: here });
            visit(l.steps, lid + ".", here);
          });
        } else {
          out.push({ id, node: n, path: ctx });
          if (n.kind === "loop") visit(n.steps, id + ".", ctx.concat([{ loop: n.title }]));
          if (n.kind === "section") visit(n.steps, id + ".", ctx.concat([{ section: n.title }]));
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
    const live = list.filter((n) => n.change !== "removed");
    const last = live[live.length - 1];
    if (!last) return false;
    if (last.kind === "end") return true;
    if (LANED[last.kind]) return last.lanes.every((l) => endsPath(l.steps));
    return false;
  }

  // ───────────────────────── code helpers ─────────────────────────

  // Most specific first: the first pattern that matches names the language.
  const LANG_HINTS = [
    ["php", /<\?php|\$this->|function\s+\w+\([^)]*\$\w+/],
    ["sql", /\b(create\s+(or\s+alter\s+)?(proc(edure)?|function|table)|select\s+[\s\S]+?\s+from|declare\s+@\w+|begin\s+tran|exec\s+sp_|insert\s+into|update\s+\w+\s+set)\b/i],
    ["shell", /^#!\/(usr\/)?bin\/(env )?(ba|z)?sh|^\s*set -[euxo]+\b/m],
    ["go", /^\s*package \w+\s*$|^\s*func (\(\w+ \*?\w+\) )?\w+\(/m],
    ["rust", /\bfn \w+(<[^>]*>)?\(|\blet mut\b|^\s*impl\b|^\s*use \w+::/m],
    ["kotlin", /\bfun \w+\(|\bsuspend fun\b|^\s*val \w+\s*[:=]/m],
    ["csharp", /\bnamespace \w+|\busing System\b|\bpublic\s+(async\s+)?Task\b|\[Http(Get|Post|Put|Delete)\b|\basync Task</],
    ["java", /^\s*import java\.|\bpublic\s+(static\s+)?(final\s+)?(class|void|interface)\b|@Override|\bprivate\s+(final\s+)?\w+(<[^>]*>)?\s+\w+\s*[;=(]/m],
    ["python", /^\s*(async\s+)?def \w+\(.*\)\s*(->.*)?:\s*$|^\s*from [\w.]+ import |^\s*import [\w.]+\s*$/m],
    ["ruby", /^\s*(def \w+[?!]?(\(|$)|class \w+ < \w+|require ['"])|\bdo \|\w+\|/m],
    ["tsx", /return\s*\(?\s*<[A-Za-z]|<\/[A-Z]\w*>|\buse(State|Effect|Memo|Callback|Ref)\(/],
    ["typescript", /\b(interface|type)\s+\w+\s*[={<]|:\s*(string|number|boolean)\b|\bas const\b/],
    ["javascript", /\b(const|let|function|=>|async|await|module\.exports|require\()/],
    ["shell", /^\s*(echo|export|if \[|fi$|for \w+ in)/m],
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
      (n.items || []).forEach(fix);
    };
    flow.steps.forEach(fix);
    return flow;
  }

  LL.flow = Object.assign(LL.flow || {}, { normalize, walkNodes, eachNode, endsPath, countBoxes, guessLanguage, numberLines, resolveAnchors, markUnreachable, LIMITS, KINDS, EXITS, LANED, NESTED });
  // helpers shared with flow-text.js and prompt.js
  LL.flow._ = { str, longStr, lines, tagOf, CHANGES };
})(globalThis.LL = globalThis.LL || {});
