/* Logic Lens — the stored data a flow touches: a bar of tables above the diagram. Clicking a table lights up every
 * box that reads or writes it and lists those boxes, so "where does this code touch `orders`?" is one click.
 */
(function (LL) {
  "use strict";

  const { S, $, hooks } = LL.app;
  const WRITE = { insert: "thêm", update: "sửa", delete: "xoá", write: "ghi" };

  /** name -> {name, note, uses: [{entry, op}]}, in order of first use (declared entities first). */
  function tables() {
    const map = new Map();
    const get = (name) => {
      if (!map.has(name)) map.set(name, { name, note: "", uses: [] });
      return map.get(name);
    };
    for (const e of (S.flow && S.flow.entities) || []) get(e.name).note = e.note || "";
    for (const entry of S.nodes) for (const d of entry.node.data || []) get(d.table).uses.push({ entry, op: d.op });
    return [...map.values()].filter((t) => t.uses.length || t.note);
  }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function render() {
    const bar = $("data-bar");
    bar.textContent = "";
    const list = S.flow ? tables() : [];
    if (!list.length) { bar.hidden = true; S.dataFocus = null; return; }
    bar.hidden = false;
    const row = el("div", "drow");
    row.appendChild(el("span", "dlabel", "Dữ liệu:"));
    for (const t of list) {
      const b = el("button", "dpill" + (S.dataFocus === t.name ? " on" : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", String(S.dataFocus === t.name));
      b.title = t.note || "Bấm để xem các bước đụng tới bảng này";
      b.append(el("span", "", "▤ " + t.name), el("small", "", String(t.uses.length)));
      b.addEventListener("click", () => focus(S.dataFocus === t.name ? null : t.name));
      row.appendChild(b);
    }
    bar.appendChild(row);
    const t = list.find((x) => x.name === S.dataFocus);
    if (!t) return;
    // the focused table: what one row is, and which boxes read / write it
    const box = el("div", "dfocus");
    box.appendChild(el("b", "", t.name));
    if (t.note) box.appendChild(el("span", "", " — " + t.note));
    const group = (label, uses) => {
      if (!uses.length) return;
      const g = el("div", "dgroup");
      g.appendChild(el("span", "dlabel", label));
      for (const u of uses) {
        const a = el("button", "dstep", (u.entry.node.title || "…") + (WRITE[u.op] && label !== "Đọc ở:" ? " (" + WRITE[u.op] + ")" : ""));
        a.type = "button";
        a.addEventListener("click", () => LL.app.select(u.entry.id));
        g.appendChild(a);
      }
      box.appendChild(g);
    };
    group("Đọc ở:", t.uses.filter((u) => u.op === "read"));
    group("Ghi ở:", t.uses.filter((u) => u.op !== "read"));
    if (!t.uses.length) box.appendChild(el("div", "muted", "Không bước nào trong sơ đồ đụng tới bảng này."));
    bar.appendChild(box);
  }

  function focus(name) {
    S.dataFocus = name;
    render();
    paint();
  }

  /** Light up the boxes that touch the focused table; fade the rest. */
  function paint() {
    const svg = $("canvas").querySelector("svg");
    if (!svg) return;
    const name = S.dataFocus;
    svg.querySelectorAll(".ll-node").forEach((g) => {
      const entry = S.byId.get(g.getAttribute("data-id"));
      const hit = !!(name && entry && (entry.node.data || []).some((d) => d.table === name));
      g.classList.toggle("dt-on", hit);
      g.classList.toggle("dt-dim", !!name && !hit && !(S.run && S.run.trail.includes(g.getAttribute("data-id"))));
    });
  }

  hooks.flow.push(() => { S.dataFocus = null; render(); });
  hooks.render.push(paint);
  hooks.paint.push(paint);
  Object.assign(LL.app, { dataTables: tables, focusTable: focus });
})(globalThis.LL = globalThis.LL || {});
