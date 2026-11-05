/* Logic Lens — the plain-text diagram format (parse / serialize) and Mermaid export.
 *
 *   title: Checkout
 *   section POST /checkout | the handler                 (independent entry point; children indented)
 *     start   Request arrives | user, cart [API]           @1-3
 *     step    Load cart [DB]                               @5
 *     call    priceItems() | re-price from the catalog
 *     branch  Cart empty?
 *       lane  yes
 *         end:respond 400 | cart_empty
 *       lane  no
 *     parallel
 *       lane  Charge card [API]
 *       lane  Reserve stock [DB]
 *     loop    For each item | decrement stock
 *       step  Decrement
 *       end:continue Skip digital items
 *     group   Join data
 *       item  Orders
 *       note  only open orders
 *   +step   New check | a box added by a code change       (+ added, ~ modified, - removed)
 *     >> why it changed (shown in the change view)
 *     > longer explanation shown when the box is clicked
 *   "!" at the end of a line marks the box for attention; "[TAG]" tags an external effect.
 */
(function (LL) {
  "use strict";

  const { str, longStr, lines, tagOf } = LL.flow._;
  const { LIMITS, eachNode, markUnreachable, LANED, NESTED, EXITS } = LL.flow;

  // ───────────────────────── text format ─────────────────────────

  const KEYWORDS = {
    start: "start", step: "step", call: "call", stage: "stage", warn: "warn", end: "end", group: "group", loop: "loop",
    branch: "branch", parallel: "parallel", section: "section", lane: "lane", item: "item", note: "note",
    // Vietnamese aliases
    "bat-dau": "start", buoc: "step", "bước": "step", goi: "call", "gọi": "call", "giai-doan": "stage", nhom: "group", "nhóm": "group",
    nhanh: "branch", "nhánh": "branch", "song-song": "parallel", lap: "loop", "lặp": "loop", "ket-thuc": "end", phan: "section", "phần": "section",
  };
  const CHANGE_MARK = { "+": "added", "~": "modified", "-": "removed" };
  const MARK_OF = { added: "+", modified: "~", removed: "-" };
  const UNREACHABLE = "không bao giờ chạy tới";

  /** Parse the text format. Returns {flow, errors: [{line, message}]}. Never throws. */
  function parseText(text) {
    const errors = [];
    const flow = { title: "", summary: "", steps: [] };
    // containers: root / lane / loop / section take boxes; group takes item/note; branch / parallel take lanes
    const stack = [{ indent: -1, list: flow.steps, kind: "root" }];
    let lastNode = null; // where a following "> detail" / ">> change" line goes
    const src = String(text || "").replace(/\t/g, "  ").split(/\r?\n/);

    for (let i = 0; i < src.length; i++) {
      const raw = src[i];
      if (!raw.trim() || /^\s*(#|\/\/)/.test(raw)) continue;
      const indent = raw.match(/^ */)[0].length;
      const line = raw.trim();

      const meta = line.match(/^(title|summary|change|tiêu đề|tóm tắt|thay đổi)\s*:\s*(.*)$/i);
      if (meta && indent === 0) {
        if (/^(title|tiêu đề)$/i.test(meta[1])) flow.title = str(meta[2], 120);
        else if (/^(change|thay đổi)$/i.test(meta[1])) flow.changeSummary = longStr(meta[2], 800);
        else flow.summary = longStr(meta[2], 600);
        continue;
      }
      if (line.startsWith(">")) {
        const isChange = line.startsWith(">>");
        const body = line.slice(isChange ? 2 : 1).trim();
        if (!lastNode) { errors.push({ line: i + 1, message: "Dòng giải thích “>” phải nằm ngay dưới một ô." }); continue; }
        const key = isChange ? "changeNote" : "detail";
        lastNode[key] = (lastNode[key] ? lastNode[key] + "\n" : "") + body;
        continue;
      }

      // keyword, with an optional change mark in front (+ ~ -) and an optional exit after a colon (end:throw)
      const m = line.match(/^([+~-]?)([^\s:]+)(?::(\w+))?\s*(.*)$/);
      const change = CHANGE_MARK[m[1]] || "";
      const kw = KEYWORDS[m[2].toLowerCase()];
      if (!kw) {
        errors.push({ line: i + 1, message: `Không hiểu từ “${m[2]}”. Mỗi dòng bắt đầu bằng start, step, call, stage, warn, end, group, item, note, loop, branch, parallel, lane hoặc section.` });
        continue;
      }
      let rest = m[4];
      let attention = false;
      if (/\s!$|^!$/.test(rest)) { attention = true; rest = rest.replace(/\s*!$/, ""); }
      let range = null;
      const at = rest.match(/\s*@\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
      if (at) { range = lines([at[1], at[2] || at[1]]); rest = rest.slice(0, at.index); }
      let tag = "";
      const tg = rest.match(/\s*\[([A-Za-z][\w /-]{0,9})\]\s*(?=\||$)/);
      if (tg) { tag = tagOf(tg[1]); rest = (rest.slice(0, tg.index) + " " + rest.slice(tg.index + tg[0].length)).trim(); }
      // " | " (with spaces) separates title and sub-line, so code like `a || b` stays in the title
      const bar = rest.search(/\s\|\s|\s\|$/);
      const t = str(bar === -1 ? rest : rest.slice(0, bar), LIMITS.title);
      const sub = str(bar === -1 ? "" : rest.slice(bar + 2), LIMITS.sub);
      const extra = (o) => { if (tag) o.tag = tag; if (change) o.change = change; return o; };

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const top = stack[stack.length - 1];

      if (kw === "item" || kw === "note") {
        if (top.kind !== "group") { errors.push({ line: i + 1, message: `“${m[2]}” phải thụt vào bên dưới một group.` }); continue; }
        if (kw === "item") { if (top.owner.items.length < LIMITS.items) top.owner.items.push(extra({ title: t || "…", sub, attention, lines: range })); }
        else top.owner.note = str(rest, LIMITS.sub);
        lastNode = null;
        continue;
      }
      if (kw === "lane") {
        if (!LANED[top.kind]) { errors.push({ line: i + 1, message: "“lane” phải thụt vào bên dưới một branch hoặc parallel." }); continue; }
        const ln = extra({ title: t || "…", sub, detail: "", lines: range, attention, steps: [] });
        top.owner.lanes.push(ln);
        stack.push({ indent, list: ln.steps, kind: "lane", owner: ln });
        lastNode = ln;
        continue;
      }
      if (LANED[top.kind]) { errors.push({ line: i + 1, message: "Bên dưới branch / parallel, mỗi dòng phải là một lane." }); continue; }
      if (top.kind === "group") { errors.push({ line: i + 1, message: "Bên dưới group chỉ dùng item hoặc note." }); continue; }
      if (kw === "section" && top.kind !== "root") { errors.push({ line: i + 1, message: "“section” chỉ dùng ở cấp ngoài cùng." }); continue; }

      const node = extra({ kind: kw === "warn" ? "step" : kw, title: t, sub, detail: "", lines: range, attention: attention || kw === "warn" });
      if (kw === "end") node.exit = EXITS.includes((m[3] || "").toLowerCase()) ? m[3].toLowerCase() : "return";
      if (kw === "group") { node.items = []; node.note = ""; }
      if (NESTED[kw]) node.steps = [];
      if (LANED[kw]) node.lanes = [];
      if (!LANED[kw] && !t) errors.push({ line: i + 1, message: "Ô này cần có tiêu đề." });
      top.list.push(node);
      if (kw === "group") stack.push({ indent, kind: "group", owner: node });
      if (LANED[kw]) stack.push({ indent, kind: kw, owner: node });
      if (NESTED[kw]) stack.push({ indent, list: node.steps, kind: kw, owner: node });
      lastNode = node;
    }
    eachNode(flow, (n) => { if (LANED[n.kind] && !n.lanes.length) errors.push({ line: 0, message: `Có một ${n.kind} chưa có lane nào.` }); });
    const before = JSON.stringify(flow);
    markUnreachable(flow);
    if (JSON.stringify(flow) !== before) errors.push({ line: 0, message: "Có ô đứng sau một “end” trong cùng nhánh: ô đó sẽ không bao giờ chạy tới." });
    return { flow, errors };
  }

  const range = (r) => (r ? "   @" + r[0] + (r[1] !== r[0] ? "-" + r[1] : "") : "");

  /** Serialize a Flow back to the text format. */
  function toText(flow) {
    const out = [];
    if (flow.title) out.push("title: " + flow.title);
    if (flow.summary) out.push("summary: " + flow.summary.replace(/\n+/g, " "));
    if (flow.changeSummary) out.push("change: " + flow.changeSummary.replace(/\n+/g, " "));
    if (out.length) out.push("");
    const head = (kw, n, pad) => {
      // the "never reached" mark is derived from the order of boxes, so it is not written out
      const sub = n.unreachable ? (n.sub || "").replace(UNREACHABLE + " · ", "").replace(UNREACHABLE, "") : n.sub;
      const attention = n.attention && !(n.unreachable && !n.attentionOwn);
      if (kw === "warn" && !attention) kw = "step";
      let k = (MARK_OF[n.change] || "") + kw + (kw === "end" && n.exit && n.exit !== "return" ? ":" + n.exit : "");
      let s = pad + (k + " ").padEnd(7) + (n.title || "");
      if (n.tag) s += " [" + n.tag + "]";
      if (sub) s += " | " + sub;
      s += range(n.lines);
      if (attention && kw !== "warn") s += " !";
      out.push(s.replace(/\s+$/, ""));
      if (n.changeNote) for (const d of n.changeNote.split("\n")) if (d.trim()) out.push(pad + "  >> " + d.trim());
      if (n.detail) for (const d of n.detail.split("\n")) if (d.trim()) out.push(pad + "  > " + d.trim());
    };
    const walk = (list, pad) => {
      for (const n of list) {
        if (LANED[n.kind]) {
          head(n.kind, n, pad);
          for (const l of n.lanes) {
            head("lane", l, pad + "  ");
            walk(l.steps, pad + "    ");
          }
          continue;
        }
        head(n.kind === "step" && n.attention ? "warn" : n.kind, n, pad);
        if (n.kind === "group") {
          for (const it of n.items || []) out.push(pad + "  " + ((MARK_OF[it.change] || "") + "item ").padEnd(7) + it.title + (it.tag ? " [" + it.tag + "]" : "") + (it.sub ? " | " + it.sub : "") + range(it.lines) + (it.attention ? " !" : ""));
          if (n.note) out.push(pad + "  note   " + n.note);
        }
        if (NESTED[n.kind]) walk(n.steps, pad + "  ");
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
      const mark = x.change === "added" ? "+ " : x.change === "modified" ? "~ " : x.change === "removed" ? "− " : "";
      const t = mark + mm(x.title) + (x.tag ? " [" + mm(x.tag) + "]" : "");
      const s = mm(x.sub);
      return `"${s ? `<b>${t}</b><br/><small>${s}</small>` : t}"`;
    };
    const cls = { stage: [], attention: [], endnode: [], added: [], modified: [], removed: [] };
    const mark = (nid, x) => {
      if (x.attention) cls.attention.push(nid);
      if (x.change) cls[x.change].push(nid);
    };
    // returns {first: [ids], last: [ids that continue]}
    const seq = (list, indent) => {
      let first = null;
      let prevLast = null;
      for (const node of list) {
        let ends;
        if (LANED[node.kind]) {
          const heads = [];
          const tails = [];
          for (const l of node.lanes) {
            const lid = id();
            out.push(`${indent}${lid}[${label(l)}]`);
            mark(lid, l);
            heads.push(lid);
            const inner = seq(l.steps, indent);
            if (inner.first) { for (const f of inner.first) out.push(`${indent}${lid} --> ${f}`); tails.push(...inner.last); }
            else tails.push(lid);
          }
          ends = { first: heads, last: tails, label: node.kind === "parallel" ? "song song" : node.title };
        } else if (node.kind === "group") {
          const gid = id();
          const parts = (node.items || []).map((it) => it.title + (it.sub ? " (" + it.sub + ")" : "")).join(" · ");
          const sub = [node.sub, parts, node.note].filter(Boolean).join("<br/>");
          out.push(`${indent}${gid}[${label({ title: node.title, sub, change: node.change, tag: node.tag })}]`);
          cls.stage.push(gid);
          mark(gid, node);
          ends = { first: [gid], last: [gid] };
        } else if (NESTED[node.kind]) {
          const sid = "s" + ++n;
          const prefix = node.kind === "loop" ? "↻ " : "";
          out.push(`${indent}subgraph ${sid}["${prefix}${mm(node.title)}"]`);
          const inner = seq(node.steps, indent + "  ");
          out.push(`${indent}end`);
          mark(sid, node);
          ends = node.kind === "section" ? { first: [], last: [] } : inner.first ? { first: inner.first, last: inner.last } : { first: [sid], last: [sid] };
        } else {
          const nid = id();
          const shape = node.kind === "end" || node.kind === "start" ? ["([", "])"] : node.kind === "call" ? ["[[", "]]"] : ["[", "]"];
          out.push(`${indent}${nid}${shape[0]}${label(node)}${shape[1]}`);
          if (node.kind === "stage") cls.stage.push(nid);
          if (node.kind === "end") cls.endnode.push(nid);
          mark(nid, node);
          ends = { first: [nid], last: node.kind === "end" || node.change === "removed" ? [] : [nid] };
        }
        if (node.change === "removed" && !LANED[node.kind]) {
          // a removed box hangs off the flow with a dotted line and is skipped by it
          if (prevLast) for (const a of prevLast) for (const b of ends.first) out.push(`${indent}${a} -.- ${b}`);
          if (!first) first = ends.first;
          continue;
        }
        const arrow = ends.label ? ` -- "${mm(ends.label)}" --> ` : " --> ";
        if (prevLast) for (const a of prevLast) for (const b of ends.first) out.push(`${indent}${a}${arrow}${b}`);
        if (!first) first = ends.first;
        prevLast = node.kind === "section" ? null : ends.last;
      }
      return { first, last: prevLast || [] };
    };
    seq(flow.steps, "  ");
    out.push("  classDef stage fill:#e4eff6,stroke:#3c7fa8,color:#16212b");
    out.push("  classDef endnode fill:#eef1f4,stroke:#5f6c78,color:#16212b");
    out.push("  classDef attention stroke:#c8462f,stroke-dasharray:5 4");
    out.push("  classDef added fill:#e3f6ea,stroke:#1f8a52,stroke-width:2px");
    out.push("  classDef modified fill:#fff4dc,stroke:#c98a00,stroke-width:2px");
    out.push("  classDef removed fill:#fbe9e7,stroke:#c8462f,stroke-dasharray:4 3,color:#9a5b52");
    for (const [k, ids] of Object.entries(cls)) if (ids.length) out.push("  class " + ids.join(",") + " " + k);
    return out.join("\n") + "\n";
  }

  Object.assign(LL.flow, { parseText, toText, toMermaid });
})(globalThis.LL = globalThis.LL || {});
