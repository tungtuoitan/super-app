/* Logic Lens — flow model, text format, normalization, Mermaid export, prompt for Claude.
 * Pure functions: no DOM. Works in the browser and in Node (tests).
 *
 * Model
 *   Flow  = { title, summary, steps: Node[] }
 *   Node  = { kind: "step" | "stage" | "group" | "branch", title, sub, detail, lines: [from, to] | null, attention,
 *             items?: {title, sub}[], note?: string,        // group
 *             lanes?: Lane[] }                               // branch
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
 *   branch
 *     lane Rows
 *       step Count | rows after filtering
 *     lane Timeline !
 *       step Group | by GroupBy
 *   stage Return result
 *   ("!" at the end of any line marks the box for attention.)
 */
(function (LL) {
  "use strict";

  const KINDS = ["step", "stage", "group", "branch"];
  const LIMITS = { depth: 4, lanes: 6, items: 8, steps: 40, title: 80, sub: 140, detail: 1200 };

  // ───────────────────────── normalize ─────────────────────────

  const str = (v, max) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max || 400));
  const longStr = (v, max) => (v == null ? "" : String(v).replace(/\r\n/g, "\n").trim().slice(0, max || 2000));

  function lines(v) {
    if (!v) return null;
    let a, b;
    if (Array.isArray(v)) [a, b] = v;
    else if (typeof v === "object") { a = v.from != null ? v.from : v.start; b = v.to != null ? v.to : v.end; }
    else if (typeof v === "string") { const m = v.match(/(\d+)\s*(?:[-–:]\s*(\d+))?/); if (m) { a = m[1]; b = m[2]; } }
    else if (typeof v === "number") a = v;
    a = Math.round(Number(a));
    b = b == null ? a : Math.round(Number(b));
    if (!Number.isFinite(a) || a < 1) return null;
    if (!Number.isFinite(b) || b < a) b = a;
    return [a, b];
  }

  /** Make any loosely shaped object (from Claude or hand-written JSON) a valid Flow. */
  function normalize(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const steps = Array.isArray(r) ? r : r.steps || r.flow || r.nodes || [];
    let count = 0;
    const node = (n, depth) => {
      if (!n || typeof n !== "object" || count >= LIMITS.steps * 3) return null;
      count++;
      let kind = String(n.kind || n.type || "step").toLowerCase();
      let attention = !!(n.attention || n.warn || n.highlight === "warn");
      if (kind === "warn" || kind === "attention" || kind === "note") { kind = "step"; attention = true; }
      if (kind === "phase" || kind === "section") kind = "stage";
      if (kind === "if" || kind === "switch" || kind === "fork") kind = "branch";
      if (!KINDS.includes(kind)) kind = "step";
      const out = { kind, title: str(n.title || n.label || n.name, LIMITS.title), sub: str(n.sub || n.subtitle || n.description, LIMITS.sub), detail: longStr(n.detail || n.explanation, LIMITS.detail), lines: lines(n.lines || n.lineRange || n.range), attention };
      if (kind === "group") {
        out.items = (Array.isArray(n.items) ? n.items : Array.isArray(n.children) ? n.children : []).slice(0, LIMITS.items)
          .map((it) => (typeof it === "string" ? { title: str(it, LIMITS.title), sub: "" } : { title: str(it && (it.title || it.label), LIMITS.title), sub: str(it && (it.sub || it.subtitle), LIMITS.sub) }))
          .filter((it) => it.title);
        out.note = str(n.note, LIMITS.sub);
      }
      if (kind === "branch") {
        const lanes = (Array.isArray(n.lanes) ? n.lanes : Array.isArray(n.branches) ? n.branches : Array.isArray(n.cases) ? n.cases : []).slice(0, LIMITS.lanes);
        out.lanes = lanes.map((l) => ({
          title: str(l && (l.title || l.label || l.when || l.condition), LIMITS.title) || "…",
          sub: str(l && (l.sub || l.subtitle), LIMITS.sub),
          detail: longStr(l && (l.detail || l.explanation), LIMITS.detail),
          lines: lines(l && (l.lines || l.range)),
          attention: !!(l && (l.attention || l.warn)),
          steps: depth < LIMITS.depth ? ((l && (l.steps || l.flow || l.nodes)) || []).map((c) => node(c, depth + 1)).filter(Boolean) : [],
        }));
        if (!out.lanes.length) { out.kind = "step"; delete out.lanes; }
      }
      if (!out.title && kind !== "branch") out.title = "…";
      return out;
    };
    return {
      title: str(r.title, 120),
      summary: longStr(r.summary, 600),
      steps: (Array.isArray(steps) ? steps : []).slice(0, LIMITS.steps).map((n) => node(n, 1)).filter(Boolean),
    };
  }

  // ───────────────────────── text format ─────────────────────────

  const KEYWORDS = { step: "step", stage: "stage", warn: "warn", group: "group", branch: "branch", lane: "lane", item: "item", note: "note",
    // Vietnamese aliases
    buoc: "step", "bước": "step", "giai-doan": "stage", "nhom": "group", "nhóm": "group", "nhanh": "branch", "nhánh": "branch" };

  /** Parse the text format. Returns {flow, errors: [{line, message}]}. Never throws. */
  function parseText(text) {
    const errors = [];
    const flow = { title: "", summary: "", steps: [] };
    // stack of {indent, container: array to push nodes into, kind: "root"|"lane"|"group"|"branch", owner}
    const stack = [{ indent: -1, list: flow.steps, kind: "root" }];
    let lastNode = null; // the node that a following "> detail" line belongs to
    const src = String(text || "").replace(/\t/g, "  ").split(/\r?\n/);

    for (let i = 0; i < src.length; i++) {
      const raw = src[i];
      if (!raw.trim() || /^\s*(#|\/\/)/.test(raw)) continue;
      const indent = raw.match(/^ */)[0].length;
      let line = raw.trim();

      const meta = line.match(/^(title|summary|tiêu đề|tom tat|tóm tắt)\s*:\s*(.*)$/i);
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
        errors.push({ line: i + 1, message: `Không hiểu từ “${m[1]}”. Mỗi dòng bắt đầu bằng step, stage, warn, group, item, note, branch hoặc lane.` });
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

      // pop to the container this indentation belongs to
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const top = stack[stack.length - 1];

      if (kw === "item" || kw === "note") {
        if (top.kind !== "group") { errors.push({ line: i + 1, message: `“${m[1]}” phải thụt vào bên dưới một group.` }); continue; }
        if (kw === "item") { if (top.owner.items.length < LIMITS.items) top.owner.items.push({ title: t || "…", sub }); }
        else top.owner.note = str(rest, LIMITS.sub);
        lastNode = null;
        continue;
      }
      if (kw === "lane") {
        if (top.kind !== "branch") { errors.push({ line: i + 1, message: "“lane” phải thụt vào bên dưới một branch." }); continue; }
        const lane = { title: t || "…", sub, detail: "", lines: range, attention, steps: [] };
        top.owner.lanes.push(lane);
        stack.push({ indent, list: lane.steps, kind: "lane", owner: lane });
        lastNode = lane;
        continue;
      }
      if (top.kind === "branch") { errors.push({ line: i + 1, message: "Bên dưới branch, mỗi dòng phải là một lane." }); continue; }
      if (top.kind === "group") { errors.push({ line: i + 1, message: "Bên dưới group chỉ dùng item hoặc note." }); continue; }

      const node = { kind: kw === "warn" ? "step" : kw, title: t, sub, detail: "", lines: range, attention: attention || kw === "warn" };
      if (kw === "group") { node.items = []; node.note = ""; }
      if (kw === "branch") node.lanes = [];
      if (kw !== "branch" && !t) errors.push({ line: i + 1, message: "Ô này cần có tiêu đề." });
      top.list.push(node);
      if (kw === "group") stack.push({ indent, list: null, kind: "group", owner: node });
      if (kw === "branch") stack.push({ indent, list: null, kind: "branch", owner: node });
      lastNode = kw === "branch" ? null : node;
    }
    // empty branches are errors that would render nothing
    const check = (list) => {
      for (const n of list) {
        if (n.kind === "branch") {
          if (!n.lanes.length) errors.push({ line: 0, message: "Có một branch chưa có lane nào." });
          n.lanes.forEach((l) => check(l.steps));
        }
      }
    };
    check(flow.steps);
    return { flow, errors };
  }

  /** Serialize a Flow back to the text format. */
  function toText(flow) {
    const out = [];
    if (flow.title) out.push("title: " + flow.title);
    if (flow.summary) out.push("summary: " + flow.summary.replace(/\n+/g, " "));
    if (out.length) out.push("");
    const head = (kw, n, pad) => {
      let s = pad + kw.padEnd(6) + (n.title || "");
      if (n.sub) s += " | " + n.sub;
      if (n.lines) s += "   @" + n.lines[0] + (n.lines[1] !== n.lines[0] ? "-" + n.lines[1] : "");
      if (n.attention && kw !== "warn") s += " !";
      out.push(s.replace(/\s+$/, ""));
      if (n.detail) for (const d of n.detail.split("\n")) if (d.trim()) out.push(pad + "  > " + d.trim());
    };
    const walk = (list, pad) => {
      for (const n of list) {
        if (n.kind === "branch") {
          out.push(pad + "branch" + (n.title ? " " + n.title : ""));
          for (const l of n.lanes) {
            head("lane", l, pad + "  ");
            walk(l.steps, pad + "    ");
          }
          continue;
        }
        head(n.kind === "step" && n.attention ? "warn" : n.kind, n, pad);
        if (n.kind === "group") {
          for (const it of n.items || []) out.push(pad + "  item  " + it.title + (it.sub ? " | " + it.sub : ""));
          if (n.note) out.push(pad + "  note  " + n.note);
        }
      }
    };
    walk(flow.steps, "");
    return out.join("\n") + "\n";
  }

  // ───────────────────────── traversal ─────────────────────────

  /** Depth-first list of every clickable box, in reading order, each with a stable id. */
  function walkNodes(flow) {
    const out = [];
    const visit = (list, path) => {
      list.forEach((n, i) => {
        const id = path + i;
        if (n.kind === "branch") {
          n.lanes.forEach((l, j) => {
            const lid = id + ".l" + j;
            out.push({ id: lid, node: l, lane: true, depth: path.split(".").length });
            visit(l.steps, lid + ".");
          });
        } else {
          out.push({ id, node: n, depth: path.split(".").length });
        }
      });
    };
    visit(flow.steps, "");
    return out;
  }

  function countBoxes(flow) {
    return walkNodes(flow).length;
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
    const styles = { stage: [], attention: [] };
    // returns {first: [ids], last: [ids]} of a sequence
    const seq = (list) => {
      let first = null;
      let prevLast = null;
      for (const node of list) {
        let ends;
        if (node.kind === "branch") {
          const heads = [];
          const tails = [];
          for (const l of node.lanes) {
            const lid = id();
            out.push(`  ${lid}[${label(l)}]`);
            styles.stage.push(lid);
            if (l.attention) styles.attention.push(lid);
            heads.push(lid);
            const inner = seq(l.steps);
            if (inner.first) { for (const f of inner.first) out.push(`  ${lid} --> ${f}`); tails.push(...inner.last); }
            else tails.push(lid);
          }
          ends = { first: heads, last: tails };
        } else if (node.kind === "group") {
          const gid = id();
          const parts = (node.items || []).map((it) => it.title + (it.sub ? " (" + it.sub + ")" : "")).join(" · ");
          const sub = [node.sub, parts, node.note].filter(Boolean).join("<br/>");
          out.push(`  ${gid}[${label({ title: node.title, sub })}]`);
          styles.stage.push(gid);
          if (node.attention) styles.attention.push(gid);
          ends = { first: [gid], last: [gid] };
        } else {
          const nid = id();
          out.push(`  ${nid}[${label(node)}]`);
          if (node.kind === "stage") styles.stage.push(nid);
          if (node.attention) styles.attention.push(nid);
          ends = { first: [nid], last: [nid] };
        }
        if (prevLast) for (const a of prevLast) for (const b of ends.first) out.push(`  ${a} --> ${b}`);
        if (!first) first = ends.first;
        prevLast = ends.last;
      }
      return { first, last: prevLast || [] };
    };
    seq(flow.steps);
    out.push("  classDef stage fill:#e3eef5,stroke:#3d7ea6,color:#16232e");
    out.push("  classDef attention stroke:#c8462f,stroke-dasharray:5 4");
    if (styles.stage.length) out.push("  class " + styles.stage.join(",") + " stage");
    if (styles.attention.length) out.push("  class " + styles.attention.join(",") + " attention");
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

  /** Resolve {from: "text", to: "text"} anchors against code into [line, line] (used by the examples). */
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

  const DETAIL_GUIDE = {
    simple: "Keep it short: 4 to 7 top-level boxes, branches only for the main split.",
    normal: "Aim for 5 to 10 top-level boxes; use branches and groups where the code really has them.",
    detailed: "Be thorough: up to 14 top-level boxes, include nested branches and every meaningful check.",
  };

  /** The instruction Claude receives, with the numbered code. */
  function buildPrompt(code, opts) {
    const o = opts || {};
    const lang = o.language === "en" ? "English" : "Vietnamese";
    const codeLang = o.codeLanguage || guessLanguage(code);
    return [
      "You turn source code into a simple, visual flow diagram that helps a developer understand the logic step by step.",
      "",
      "Read the code below and describe its control flow as a JSON object with this exact shape:",
      "{",
      '  "title": "short name of what the code does",',
      '  "summary": "one or two plain sentences: what goes in, what comes out",',
      '  "steps": [ Node, ... ]',
      "}",
      "Node is one of:",
      '  {"kind": "step",   "title": "...", "sub": "...", "detail": "...", "lines": [from, to], "attention": false}',
      '  {"kind": "stage",  ...same fields}   // a main phase of the code; shown highlighted',
      '  {"kind": "group",  ...same fields, "items": [{"title": "...", "sub": "..."}], "note": "..."}   // several things combined in one phase (tables joined, sources merged, parallel calls)',
      '  {"kind": "branch", "lanes": [ {"title": "...", "sub": "...", "detail": "...", "lines": [from, to], "attention": false, "steps": [Node, ...]} ]}   // mutually exclusive paths (if/else, switch, modes); lanes rejoin afterwards',
      "",
      "Rules:",
      `- Write every title, sub, detail and note in ${lang}. Keep code identifiers (table names, variables, functions) as they are.`,
      "- title: at most 5 words, starting with a verb or a noun phrase, e.g. \"Build the filter\". Number the main stages (\"1. ...\", \"2. ...\") when the code has clear phases.",
      "- sub: at most 10 words saying what concretely happens, e.g. \"one AND clause per non-NULL parameter\".",
      "- detail: 1 to 3 plain sentences a newcomer needs: why this step exists, what to watch for. No code.",
      "- lines: the first and last line numbers (from the numbered listing) that this box describes. Every box should have them.",
      "- attention: true for the few boxes a reader should look at twice: surprising behavior, side effects, performance traps, a branch that differs from the others, values that are NOT set. Use it sparingly.",
      "- Describe the logic, not the syntax. Merge trivial lines into one box. Never invent behavior the code does not have.",
      "- Use a branch only when paths really diverge; put each path's own steps inside its lane, and the shared steps after the branch.",
      "- " + (DETAIL_GUIDE[o.detail] || DETAIL_GUIDE.normal),
      "- The first box is the input (parameters, request, arguments). The last box is the output or the final effect.",
      "",
      "Reply with only the JSON object.",
      "",
      `Code (${codeLang}, ${String(code).split("\n").length} lines, numbered):`,
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
      try {
        const flow = normalize(JSON.parse(c));
        if (flow.steps.length) return { flow, error: null };
      } catch (e) { /* try the next form */ }
    }
    const asText = parseText(t);
    if (asText.flow.steps.length) return { flow: asText.flow, error: null, errors: asText.errors };
    return { flow: null, error: "Không tìm thấy sơ đồ trong nội dung này. Hãy dán nguyên đoạn JSON mà Claude trả về." };
  }

  LL.flow = { normalize, parseText, toText, walkNodes, countBoxes, toMermaid, guessLanguage, numberLines, resolveAnchors, buildPrompt, parseReply, LIMITS };
})(globalThis.LL = globalThis.LL || {});
