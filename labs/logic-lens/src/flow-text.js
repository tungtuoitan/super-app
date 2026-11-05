/* Logic Lens — the plain-text diagram format (parse / serialize) and Mermaid export. Format reference: flow.js header. */
(function (LL) {
  "use strict";

  const { str, longStr, lines } = LL.flow._;
  const { LIMITS, eachNode, markUnreachable } = LL.flow;

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
      // " | " (with spaces) separates title and sub-line, so code like `a || b` stays in the title
      const bar = rest.search(/\s\|\s|\s\|$/);
      const t = str(bar === -1 ? rest : rest.slice(0, bar), LIMITS.title);
      const sub = str(bar === -1 ? "" : rest.slice(bar + 2), LIMITS.sub);

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const top = stack[stack.length - 1];

      if (kw === "item" || kw === "note") {
        if (top.kind !== "group") { errors.push({ line: i + 1, message: `“${m[1]}” phải thụt vào bên dưới một group.` }); continue; }
        if (kw === "item") { if (top.owner.items.length < LIMITS.items) top.owner.items.push({ title: t || "…", sub, attention, lines: range }); }
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
      lastNode = node;
    }
    eachNode(flow, (n) => { if (n.kind === "branch" && !n.lanes.length) errors.push({ line: 0, message: "Có một branch chưa có lane nào." }); });
    const before = JSON.stringify(flow);
    markUnreachable(flow);
    if (JSON.stringify(flow) !== before) errors.push({ line: 0, message: "Có ô đứng sau một “end” trong cùng nhánh: ô đó sẽ không bao giờ chạy tới." });
    return { flow, errors };
  }

  /** Serialize a Flow back to the text format. */
  function toText(flow) {
    const out = [];
    if (flow.title) out.push("title: " + flow.title);
    if (flow.summary) out.push("summary: " + flow.summary.replace(/\n+/g, " "));
    if (out.length) out.push("");
    const UNREACHABLE = "không bao giờ chạy tới";
    const head = (kw, n, pad) => {
      // the "never reached" mark is derived from the order of boxes, so it is not written out
      const sub = n.unreachable ? (n.sub || "").replace(UNREACHABLE + " · ", "").replace(UNREACHABLE, "") : n.sub;
      const attention = n.attention && !(n.unreachable && !n.attentionOwn);
      if (kw === "warn" && !attention) kw = "step";
      let s = pad + (kw + " ").padEnd(6) + (n.title || "");
      if (sub) s += " | " + sub;
      if (n.lines) s += "   @" + n.lines[0] + (n.lines[1] !== n.lines[0] ? "-" + n.lines[1] : "");
      if (attention && kw !== "warn") s += " !";
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
          for (const it of n.items || []) out.push(pad + "  item  " + it.title + (it.sub ? " | " + it.sub : "") + (it.lines ? "   @" + it.lines[0] + (it.lines[1] !== it.lines[0] ? "-" + it.lines[1] : "") : "") + (it.attention ? " !" : ""));
          if (n.note) out.push(pad + "  note  " + n.note);
        }
        if (n.kind === "loop") walk(n.steps, pad + "  ");
      }
    };
    walk(flow.steps, "");
    return out.join("\n") + "\n";
  }

  // ───────────────────────── Mermaid ─────────────────────────

  function toMermaid(flow) {
    const out = ["flowchart TD"];
    let n = 0;
    const id = () => "n" + ++n;
    const mm = (v) => String(v || "").replace(/"/g, "#quot;").replace(/</g, "#lt;").replace(/>/g, "#gt;");
    const label = (x) => {
      const t = mm(x.title);
      const s = mm(x.sub);
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
        const arrow = ends.label ? ` -- "${mm(ends.label)}" --> ` : " --> ";
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

  Object.assign(LL.flow, { parseText, toText, toMermaid });
})(globalThis.LL = globalThis.LL || {});
