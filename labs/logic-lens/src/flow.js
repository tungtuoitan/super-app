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
            ? { title: str(it.title || it.label || it.name, LIMITS.title), sub: str(it.sub || it.subtitle, LIMITS.sub), attention: !!(it.attention || it.warn) }
            : { title: str(it, LIMITS.title), sub: "", attention: false }))
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
    if (sawZero) eachNode(flow, (n) => { if (n.lines) n.lines = [n.lines[0] + 1, n.lines[1] + 1]; });
    else eachNode(flow, (n) => { if (n.lines && n.lines[0] < 1) n.lines = null; });
    return flow;
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

  // ───────────────────────── text format ─────────────────────────

  const KEYWORDS = { step: "step", stage: "stage", warn: "warn", end: "end", group: "group", loop: "loop", branch: "branch", lane: "lane", item: "item", note: "note",
    // Vietnamese aliases
    buoc: "step", "bước": "step", "giai-doan": "stage", "nhom": "group", "nhóm": "group", "nhanh": "branch", "nhánh": "branch", lap: "loop", "lặp": "loop", "ket-thuc": "end" };

  /** Parse the text format. Returns {flow, errors: [{line, message}]}. Never throws. */
  function parseText(text) {
    const errors = [];
    const flow = { title: "", summary: "", steps: [] };
    // containers: root / lane / loop take nodes; group takes item/note; branch takes lanes
    const stack = [{ indent: -1, list: flow.steps, kind: "root" }];
    let lastNode = null; // where a following "> detail" line goes
    let lastItem = null;
    const src = String(text || "").replace(/\t/g, "  ").split(/\r?\n/);

    for (let i = 0; i < src.length; i++) {
      const raw = src[i];
      if (!raw.trim() || /^\s*(#|\/\/)/.test(raw)) continue;
      const indent = raw.match(/^ */)[0].length;
      const line = raw.trim();

      const meta = line.match(/^(title|summary|tiêu đề|tóm tắt)\s*:\s*(.*)$/i);
      if (meta && indent === 0) {
        if (/^(title|tiêu đề)$/i.test(meta[1])) flow.title = str(meta[2], 120);
        else flow.summary = longStr(meta[2], 600);
        continue;
      }
      if (line.startsWith(">")) {
        if (lastNode) lastNode.detail = (lastNode.detail ? lastNode.detail + "\n" : "") + line.slice(1).trim();
        else errors.push({ line: i + 1, message: "Dòng giải thích “>” phải nằm ngay dưới một ô." });
        continue;
      }

      const m = line.match(/^([^\s]+)\s*(.*)$/);
      const kw = KEYWORDS[m[1].toLowerCase()];
      if (!kw) {
        errors.push({ line: i + 1, message: `Không hiểu từ “${m[1]}”. Mỗi dòng bắt đầu bằng step, stage, warn, end, group, item, note, loop, branch hoặc lane.` });
        continue;
      }
      let rest = m[2];
      let attention = false;
      if (/\s!$|^!$/.test(rest)) { attention = true; rest = rest.replace(/\s*!$/, ""); }
      let range = null;
      const at = rest.match(/\s*@\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
      if (at) { range = lines([at[1], at[2] || at[1]]); rest = rest.slice(0, at.index); }
      const [title, ...subParts] = rest.split("|");
      const t = str(title, LIMITS.title);
      const sub = str(subParts.join("|"), LIMITS.sub);

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const top = stack[stack.length - 1];

      if (kw === "item" || kw === "note") {
        if (top.kind !== "group") { errors.push({ line: i + 1, message: `“${m[1]}” phải thụt vào bên dưới một group.` }); continue; }
        if (kw === "item") { if (top.owner.items.length < LIMITS.items) top.owner.items.push({ title: t || "…", sub, attention }); }
        else top.owner.note = str(rest, LIMITS.sub);
        lastNode = null;
        continue;
      }
      if (kw === "lane") {
        if (top.kind !== "branch") { errors.push({ line: i + 1, message: "“lane” phải thụt vào bên dưới một branch." }); continue; }
        const ln = { title: t || "…", sub, detail: "", lines: range, attention, steps: [] };
        top.owner.lanes.push(ln);
        stack.push({ indent, list: ln.steps, kind: "lane", owner: ln });
        lastNode = ln;
        continue;
      }
      if (top.kind === "branch") { errors.push({ line: i + 1, message: "Bên dưới branch, mỗi dòng phải là một lane." }); continue; }
      if (top.kind === "group") { errors.push({ line: i + 1, message: "Bên dưới group chỉ dùng item hoặc note." }); continue; }

      const node = { kind: kw === "warn" ? "step" : kw, title: t, sub, detail: "", lines: range, attention: attention || kw === "warn" };
      if (kw === "group") { node.items = []; node.note = ""; }
      if (kw === "loop") node.steps = [];
      if (kw === "branch") node.lanes = [];
      if (kw !== "branch" && !t) errors.push({ line: i + 1, message: "Ô này cần có tiêu đề." });
      top.list.push(node);
      if (kw === "group") stack.push({ indent, kind: "group", owner: node });
      if (kw === "branch") stack.push({ indent, kind: "branch", owner: node });
      if (kw === "loop") stack.push({ indent, list: node.steps, kind: "loop", owner: node });
      lastNode = kw === "branch" ? null : node;
      lastItem = null;
    }
    eachNode(flow, (n) => { if (n.kind === "branch" && !n.lanes.length) errors.push({ line: 0, message: "Có một branch chưa có lane nào." }); });
    return { flow, errors };
  }

  /** Serialize a Flow back to the text format. */
  function toText(flow) {
    const out = [];
    if (flow.title) out.push("title: " + flow.title);
    if (flow.summary) out.push("summary: " + flow.summary.replace(/\n+/g, " "));
    if (out.length) out.push("");
    const head = (kw, n, pad) => {
      let s = pad + (kw + " ").padEnd(6) + (n.title || "");
      if (n.sub) s += " | " + n.sub;
      if (n.lines) s += "   @" + n.lines[0] + (n.lines[1] !== n.lines[0] ? "-" + n.lines[1] : "");
      if (n.attention && kw !== "warn") s += " !";
      out.push(s.replace(/\s+$/, ""));
      if (n.detail) for (const d of n.detail.split("\n")) if (d.trim()) out.push(pad + "  > " + d.trim());
    };
    const walk = (list, pad) => {
      for (const n of list) {
        if (n.kind === "branch") {
          head("branch", n, pad);
          for (const l of n.lanes) {
            head("lane", l, pad + "  ");
            walk(l.steps, pad + "    ");
          }
          continue;
        }
        head(n.kind === "step" && n.attention ? "warn" : n.kind, n, pad);
        if (n.kind === "group") {
          for (const it of n.items || []) out.push(pad + "  item  " + it.title + (it.sub ? " | " + it.sub : "") + (it.attention ? " !" : ""));
          if (n.note) out.push(pad + "  note  " + n.note);
        }
        if (n.kind === "loop") walk(n.steps, pad + "  ");
      }
    };
    walk(flow.steps, "");
    return out.join("\n") + "\n";
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

  // ───────────────────────── Mermaid ─────────────────────────

  function toMermaid(flow) {
    const out = ["flowchart TD"];
    let n = 0;
    const id = () => "n" + ++n;
    const label = (x) => {
      const t = (x.title || "").replace(/"/g, "'");
      const s = (x.sub || "").replace(/"/g, "'");
      return `"${s ? `<b>${t}</b><br/><small>${s}</small>` : t}"`;
    };
    const cls = { stage: [], attention: [], end: [] };
    // returns {first: [ids], last: [ids that continue]}
    const seq = (list, indent) => {
      let first = null;
      let prevLast = null;
      for (const node of list) {
        let ends;
        if (node.kind === "branch") {
          const heads = [];
          const tails = [];
          for (const l of node.lanes) {
            const lid = id();
            out.push(`${indent}${lid}[${label(l)}]`);
            if (l.attention) cls.attention.push(lid);
            heads.push(lid);
            const inner = seq(l.steps, indent);
            if (inner.first) { for (const f of inner.first) out.push(`${indent}${lid} --> ${f}`); tails.push(...inner.last); }
            else tails.push(lid);
          }
          ends = { first: heads, last: tails, label: node.title };
        } else if (node.kind === "group") {
          const gid = id();
          const parts = (node.items || []).map((it) => it.title + (it.sub ? " (" + it.sub + ")" : "")).join(" · ");
          const sub = [node.sub, parts, node.note].filter(Boolean).join("<br/>");
          out.push(`${indent}${gid}[${label({ title: node.title, sub })}]`);
          cls.stage.push(gid);
          if (node.attention) cls.attention.push(gid);
          ends = { first: [gid], last: [gid] };
        } else if (node.kind === "loop") {
          const sid = "s" + ++n;
          out.push(`${indent}subgraph ${sid}["↻ ${(node.title || "").replace(/"/g, "'")}"]`);
          const inner = seq(node.steps, indent + "  ");
          out.push(`${indent}end`);
          if (node.attention) cls.attention.push(sid);
          ends = inner.first ? { first: inner.first, last: inner.last } : { first: [sid], last: [sid] };
        } else {
          const nid = id();
          out.push(node.kind === "end" ? `${indent}${nid}([${label(node)}])` : `${indent}${nid}[${label(node)}]`);
          if (node.kind === "stage") cls.stage.push(nid);
          if (node.kind === "end") cls.end.push(nid);
          if (node.attention) cls.attention.push(nid);
          ends = { first: [nid], last: node.kind === "end" ? [] : [nid] };
        }
        const arrow = ends.label ? ` -- "${ends.label.replace(/"/g, "'")}" --> ` : " --> ";
        if (prevLast) for (const a of prevLast) for (const b of ends.first) out.push(`${indent}${a}${arrow}${b}`);
        if (!first) first = ends.first;
        prevLast = ends.last;
      }
      return { first, last: prevLast || [] };
    };
    seq(flow.steps, "  ");
    out.push("  classDef stage fill:#e4eff6,stroke:#3c7fa8,color:#16212b");
    out.push("  classDef endnode fill:#eef1f4,stroke:#5f6c78,color:#16212b");
    out.push("  classDef attention stroke:#c8462f,stroke-dasharray:5 4");
    if (cls.stage.length) out.push("  class " + cls.stage.join(",") + " stage");
    if (cls.end.length) out.push("  class " + cls.end.join(",") + " endnode");
    if (cls.attention.length) out.push("  class " + cls.attention.join(",") + " attention");
    return out.join("\n") + "\n";
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

  // ───────────────────────── prompt ─────────────────────────

  const SIZE = {
    simple: { total: 10, top: "4 to 7", depth: 1, extra: "Only show the main path and the main split; fold everything else into the boxes." },
    normal: { total: 16, top: "5 to 9", depth: 2, extra: "Show the real branches and phases; fold small checks into the box they belong to." },
    detailed: { total: 26, top: "6 to 12", depth: 2, extra: "Include every meaningful check and branch, still within the limits." },
  };

  const EXAMPLE_JSON = `{
  "title": "Search RFD",
  "summary": "Builds a dynamic SQL query from optional filters, then runs exactly one view mode and returns rows plus totals.",
  "steps": [
    {"kind": "step", "title": "Receive parameters", "sub": "filters, page, view mode", "lines": [1, 14], "detail": "Every filter defaults to NULL, meaning: do not filter on it."},
    {"kind": "stage", "title": "1. Build the filter", "sub": "one AND clause per non-NULL parameter", "lines": [19, 25]},
    {"kind": "group", "title": "2. Build FROM", "lines": [27, 46], "items": [{"title": "plm.RFD"}, {"title": "Style", "sub": "Product + Collection"}], "note": "Show latest keeps the newest RFD per style"},
    {"kind": "step", "title": "3. Pick the view mode", "sub": "@ViewMode", "lines": [53, 53]},
    {"kind": "branch", "title": "@ViewMode", "lanes": [
      {"title": "= 'list'", "lines": [54, 64], "steps": [
        {"kind": "step", "title": "Count all rows", "lines": [56, 56]},
        {"kind": "loop", "title": "For each row on the page", "sub": "add file count", "lines": [57, 62], "steps": [{"kind": "step", "title": "Count files", "sub": "one sub-query per row", "attention": true, "lines": [59, 59]}]}
      ]},
      {"title": "unknown mode", "attention": true, "lines": [90, 92], "steps": [{"kind": "end", "title": "Throw error", "sub": "RAISERROR 50001", "lines": [91, 91]}]}
    ]},
    {"kind": "stage", "title": "Return result", "sub": "rows + @ov_TotalRows", "lines": [94, 97]}
  ]
}`;

  /** The instruction Claude receives, with the numbered code. */
  function buildPrompt(code, opts) {
    const o = opts || {};
    const lang = o.language === "en" ? "English" : "Vietnamese";
    const size = SIZE[o.detail] || SIZE.normal;
    const codeLang = o.codeLanguage || guessLanguage(code);
    const nLines = String(code).split("\n").length;
    return [
      "You turn source code into a simple, visual flow diagram that helps a developer understand the logic step by step, top to bottom.",
      "",
      "Return one JSON object: {\"title\", \"summary\", \"steps\": [Node, ...]}. Node kinds:",
      '- {"kind": "step", "title", "sub", "detail", "lines": [from, to], "attention": false}  one action',
      '- {"kind": "stage", ...same}  a main phase of the code (shown highlighted). Number main phases "1. ...", "2. ..." when the code has clear phases.',
      '- {"kind": "end", ...same}  the path STOPS here: return, throw, raise, exit, early response. A lane that ends with "end" does not rejoin the flow.',
      '- {"kind": "group", ...same, "items": [{"title", "sub"}], "note"}  several things combined in one phase: tables joined, sources merged, calls run in parallel. 2 to 6 items.',
      '- {"kind": "loop", ...same, "steps": [Node, ...]}  repeated work (for, while, map, cursor). title starts with "For each ..." (or the Vietnamese equivalent); steps are the body.',
      '- {"kind": "branch", "title": "the question being decided", "lanes": [{"title": "answer / condition value", "sub", "detail", "lines", "attention", "steps": [Node, ...]}]}  mutually exclusive paths (if/else, switch, modes). Lanes that do not end rejoin after the branch.',
      "",
      "Example of the shape (content invented):",
      EXAMPLE_JSON,
      "",
      "Hard limits (the diagram becomes unreadable beyond them):",
      `- At most ${size.total} boxes in total, counting lanes and loop/branch contents. ${size.top} boxes at the top level.`,
      `- At most 4 lanes per branch. Branches and loops nest at most ${size.depth} level${size.depth > 1 ? "s" : ""} deep. If the code goes deeper, summarize the inner part as one step and explain it in "detail".`,
      "- title: at most 30 characters. sub: at most 60 characters. Plain words a newcomer understands; keep code identifiers (table, variable, function names) exactly as written.",
      `- Write every title, sub, detail and note in ${lang}.`,
      "",
      "How to model the code:",
      "- The first box is the input (parameters, request, arguments). The last box on the main path is the output or final effect.",
      "- Put a step right before each branch that says what is being checked, or give the branch a title with the question. Lane titles are the answers (\"empty\", \"= 'kanban'\", \"error\").",
      "- Guard clauses (if bad: return / throw) are a branch with a lane ending in an \"end\" box and a lane for the normal path (that lane may have no steps).",
      "- try/catch: a branch with lanes \"success\" and \"error\" when the error path does something meaningful.",
      "- If the code has several functions, diagram the main entry point; show calls to the others as single steps titled with the function name.",
      `- ${size.extra} Describe behavior, not syntax. Merge trivial lines. Never invent behavior the code does not have.`,
      "- detail: 1 to 3 plain sentences: why this step exists and what to watch for. No code.",
      '- lines: 1-based line numbers from the numbered listing below, first and last line the box describes. Every box gets lines.',
      "- attention: true on at most 3 boxes a reader must look at twice: surprising behavior, side effects, performance traps, values left unset, a path that behaves differently.",
      "",
      "Reply with only the JSON object.",
      "",
      `Code (${codeLang}, ${nLines} lines, numbered):`,
      "```",
      numberLines(code),
      "```",
    ].join("\n");
  }

  /** Extract a Flow from a pasted reply (JSON, fenced JSON, or the text format). */
  function parseReply(text) {
    const t = String(text || "").trim();
    if (!t) return { flow: null, error: "Câu trả lời đang trống." };
    const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidates = [t, fenced && fenced[1]];
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first !== -1 && last > first) candidates.push(t.slice(first, last + 1));
    for (const c of candidates) {
      if (!c) continue;
      let parsed;
      try { parsed = JSON.parse(c); } catch (e) { continue; }
      const flow = normalize(parsed);
      if (flow.steps.length) return { flow, error: null };
    }
    const asText = parseText(t);
    if (asText.flow.steps.length && asText.errors.length < asText.flow.steps.length) return { flow: asText.flow, error: null, errors: asText.errors };
    return { flow: null, error: "Không tìm thấy sơ đồ trong nội dung này. Hãy dán nguyên đoạn JSON mà Claude trả về." };
  }

  LL.flow = { normalize, parseText, toText, walkNodes, eachNode, endsPath, countBoxes, toMermaid, guessLanguage, numberLines, resolveAnchors, buildPrompt, parseReply, LIMITS };
})(globalThis.LL = globalThis.LL || {});
