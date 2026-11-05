/* Logic Lens — the diagram on the page: drawing, zoom, selection, explanation panel, step-by-step tour. */
(function (LL) {
  "use strict";

  const { S, $, F, LAY, toast, copyText, setStatus, linesLabel, capability, setCode, updateCodeInfo, buildCodeView, setCodeMode, highlightLines, loadDraft, writeDraft, saveDraft, flushDraft } = LL.app;

  // ───────────────────────── diagram ─────────────────────────
  function setFlow(flow, opts) {
    const o = opts || {};
    S.flow = flow;
    S.nodes = flow ? F.walkNodes(flow) : [];
    S.byId = new Map(S.nodes.map((x, i) => [x.id, Object.assign({ index: i }, x)]));
    if (!S.byId.has(S.selected)) S.selected = null;
    $("d-title").textContent = flow && flow.title ? flow.title : flow && flow.steps.length ? "Sơ đồ" : "Chưa có sơ đồ";
    $("d-summary").textContent = flow && flow.summary ? flow.summary : "";
    if (!o.fromText) {
      $("dsl").value = flow ? F.toText(flow) : "";
      $("dsl-errors").textContent = "";
    }
    renderDiagram();
    renderExplain();
    updateTourUi();
    saveDraft(!o.fromText);
  }

  function renderDiagram() {
    const canvas = $("canvas");
    if (!S.flow || !S.flow.steps.length) {
      canvas.innerHTML = '<div class="empty">Dán code bên trái rồi bấm “Vẽ sơ đồ bằng Claude”, hoặc chọn một ví dụ.</div>';
      return;
    }
    S.narrow = canvas.clientWidth > 0 && canvas.clientWidth < 600;
    // on narrow screens draw at the real width so text stays at its true size
    const lay = LAY.layout(S.flow, S.narrow ? { narrow: true, width: Math.max(320, canvas.clientWidth - 16) } : {});
    canvas.classList.toggle("narrow", S.narrow);
    S.lay = lay;
    canvas.innerHTML = LAY.toSvg(S.flow, lay, { interactive: true });
    const svg = canvas.firstElementChild;
    applyZoom();
    svg.querySelectorAll(".ll-node").forEach((g) => {
      g.addEventListener("click", () => select(g.getAttribute("data-id"), { fromDiagram: true }));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(g.getAttribute("data-id"), { fromDiagram: true }); }
      });
    });
    svg.querySelectorAll(".ll-itemg").forEach((g) => g.addEventListener("click", () => {
      select(g.getAttribute("data-group"), { fromDiagram: true });
      const r = (g.getAttribute("data-lines") || "").split("-").map(Number);
      if (r.length === 2 && r[0]) highlightLines(r, true);
    }));
    applySelection(false);
  }

  const MIN_FIT = 0.85; // below this, text gets too small to read: scroll sideways instead
  function applyZoom() {
    const canvas = $("canvas");
    const svg = canvas.querySelector("svg");
    if (!svg || !S.lay) return;
    const avail = Math.max(200, canvas.clientWidth - 16);
    const fitScale = avail / S.lay.width;
    let scale = null;
    if (typeof S.zoom === "number") scale = S.zoom;
    else if (S.zoom === "auto" && fitScale < MIN_FIT && !S.narrow) scale = MIN_FIT;
    canvas.classList.toggle("fit", scale == null);
    svg.style.width = scale == null ? "" : Math.round(S.lay.width * scale) + "px";
    const btn = $("zoom-fit");
    if (typeof S.zoom === "number") btn.textContent = Math.round(S.zoom * 100) + "%";
    else if (scale != null) btn.textContent = "Xem toàn bộ";
    else btn.textContent = S.zoom === "all" ? "Cỡ chữ vừa đọc" : "Vừa khung";
    btn.title = scale != null ? "Thu nhỏ để thấy cả sơ đồ" : S.zoom === "all" ? "Quay lại cỡ chữ dễ đọc" : "";
  }
  function zoomBy(f) {
    const canvas = $("canvas");
    const svg = canvas.querySelector("svg");
    if (!svg || !S.lay) return;
    const current = typeof S.zoom === "number" ? S.zoom : svg.getBoundingClientRect().width / S.lay.width;
    S.zoom = Math.min(2.5, Math.max(0.4, Math.round(current * f * 10) / 10));
    applyZoom();
  }

  function applySelection(scrollIntoView) {
    const svg = $("canvas").querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".ll-node").forEach((g) => {
      const id = g.getAttribute("data-id");
      const on = id === S.selected;
      g.classList.toggle("sel", on);
      g.classList.toggle("hl", on && S.tour);
      g.classList.toggle("dim", S.tour && !on && S.selected != null);
      g.setAttribute("aria-pressed", String(on));
    });
    svg.querySelectorAll(".ll-itemg").forEach((g) => g.classList.toggle("dim", S.tour && S.selected != null && g.getAttribute("data-group") !== S.selected));
    if (scrollIntoView && S.selected && S.lay) {
      const box = S.lay.boxes.find((b) => b.id === S.selected);
      const canvas = $("canvas");
      if (box) {
        const scale = svg.getBoundingClientRect().width / S.lay.width;
        const svgTop = svg.getBoundingClientRect().top - canvas.getBoundingClientRect().top + canvas.scrollTop;
        const svgLeft = svg.getBoundingClientRect().left - canvas.getBoundingClientRect().left + canvas.scrollLeft;
        const y = svgTop + (box.y + box.h / 2) * scale;
        const x = svgLeft + (box.x + box.w / 2) * scale;
        canvas.scrollTo({ top: Math.max(0, y - canvas.clientHeight / 2), left: Math.max(0, x - canvas.clientWidth / 2), behavior: "smooth" });
        // when the canvas is not its own scroll box (phones, fit mode) scroll the page instead;
        // with the explanation sheet open, keep the box in the top part of the screen, above the sheet
        const r = svg.getBoundingClientRect();
        const by = r.top + (box.y + box.h / 2) * scale;
        const sheet = sheetMode();
        const targetY = sheet ? window.innerHeight * 0.24 : window.innerHeight / 2;
        const visibleBottom = sheet ? window.innerHeight * 0.48 : window.innerHeight - 40;
        if (canvas.scrollHeight <= canvas.clientHeight + 2 && (by < 80 || by > visibleBottom)) window.scrollBy({ top: by - targetY, behavior: "smooth" });
      }
    }
  }

  function select(id, opts) {
    const o = opts || {};
    if (!S.byId.has(id)) id = null;
    S.selected = id;
    applySelection(!o.fromDiagram || sheetMode());
    renderExplain();
    updateTourUi();
    const entry = id ? S.byId.get(id) : null;
    highlightLines(entry && entry.node.lines, !o.fromCode);
    if (id && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("ll-node")) {
      const g = $("canvas").querySelector(`.ll-node[data-id="${CSS.escape(id)}"]`);
      if (g && g !== document.activeElement) g.focus({ preventScroll: true });
    }
    $("explain-panel").classList.toggle("open", !!entry);
    document.body.classList.toggle("sheet-open", !!entry);
  }

  /** Narrow screens show the explanation as a sheet over the bottom of the screen. */
  function sheetMode() {
    return window.matchMedia && window.matchMedia("(max-width: 1060px)").matches;
  }

  /** Smallest box whose line range contains this code line. */
  function boxForLine(line) {
    let best = null;
    for (const e of S.nodes) {
      const r = e.node.lines;
      if (!r || line < r[0] || line > r[1]) continue;
      if (!best || r[1] - r[0] < best.node.lines[1] - best.node.lines[0] || (r[1] - r[0] === best.node.lines[1] - best.node.lines[0] && e.path.length > best.path.length)) best = e;
    }
    return best;
  }

  // ───────────────────────── explanation ─────────────────────────
  function renderExplain() {
    const el = $("explain");
    el.textContent = "";
    const entry = S.selected ? S.byId.get(S.selected) : null;
    $("explain-hint").textContent = entry ? "" : "bấm một ô trên sơ đồ để xem nó làm gì";
    $("explain-panel").classList.toggle("idle", !entry);
    if (!entry) {
      const p = document.createElement("p");
      p.className = "explain-empty";
      p.textContent = S.flow && S.flow.steps.length
        ? `Sơ đồ có ${S.nodes.length} ô. Bấm vào một ô để xem nó làm gì và tô sáng đúng dòng code, hoặc bấm “Đi từng bước” để đọc lần lượt từ trên xuống.`
        : "Chưa có sơ đồ.";
      el.appendChild(p);
      return;
    }
    const n = entry.node;
    const pos = document.createElement("div");
    pos.className = "pos";
    pos.textContent = `Ô ${entry.index + 1} / ${S.nodes.length}`;
    el.appendChild(pos);
    const crumb = whereText(entry);
    if (crumb) { const c = document.createElement("div"); c.className = "crumb"; c.textContent = crumb; el.appendChild(c); }
    const h = document.createElement("h3");
    h.textContent = n.title || "…";
    el.appendChild(h);
    if (n.sub) { const s = document.createElement("div"); s.className = "sub"; s.textContent = n.sub; el.appendChild(s); }
    if (n.detail) for (const para of n.detail.split("\n")) { const p = document.createElement("p"); p.textContent = para; el.appendChild(p); }
    if (n.items && n.items.length) {
      const p = document.createElement("p");
      p.textContent = "Gồm: " + n.items.map((it) => it.title + (it.sub ? " " + it.sub : "")).join(" · ");
      el.appendChild(p);
    }
    if (n.note) { const p = document.createElement("p"); p.style.color = "var(--red)"; p.textContent = n.note; el.appendChild(p); }
    if (n.kind === "end") { const p = document.createElement("p"); p.textContent = "Đường đi này dừng ở đây (return / throw / thoát), không đi tiếp xuống các bước bên dưới."; el.appendChild(p); }
    if (n.kind === "loop") { const p = document.createElement("p"); p.textContent = `Các bước bên trong khung được lặp lại (${(n.steps || []).length} bước).`; el.appendChild(p); }
    const tags = document.createElement("div");
    tags.className = "tags";
    const tag = (cls, text) => { const t = document.createElement("span"); t.className = "tag " + cls; t.textContent = text; tags.appendChild(t); return t; };
    if (entry.lane) tag("stage", "Nhánh: chỉ chạy khi rơi vào trường hợp này");
    else if (n.kind === "stage" || n.kind === "group") tag("stage", "Giai đoạn chính");
    if (n.attention) tag("attn", "Đáng chú ý");
    if (n.lines) {
      const t = tag("lines", linesLabel(n.lines));
      t.setAttribute("role", "button");
      t.tabIndex = 0;
      t.title = "Hiện các dòng này trong khung code";
      const go = () => highlightLines(n.lines, true);
      t.addEventListener("click", go);
      t.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      if (S.codeAtDraw != null && S.codeAtDraw !== S.code) tag("", "code đã sửa sau khi vẽ, số dòng có thể lệch");
    }
    if (tags.childNodes.length) el.appendChild(tags);
    if (n.lines && S.code) el.appendChild(snippet(n.lines));
  }

  /** "Nhánh 2/4 · Kanban → bước 1/3" style location of a box inside branches and loops. */
  function whereText(entry) {
    const parts = [];
    for (const p of entry.path || []) {
      if (p.loop != null) parts.push("Trong vòng lặp “" + p.loop + "”");
      else parts.push(`${p.branchTitle ? p.branchTitle + ": " : ""}nhánh ${p.laneIndex + 1}/${p.laneCount} “${p.lane}”`);
    }
    if (entry.lane) return parts.length ? parts.join(" › ") + " · chỉ chạy khi rơi vào trường hợp này" : "Chỉ chạy khi rơi vào trường hợp này";
    return parts.join(" › ");
  }

  function snippet(range) {
    const ls = S.code.split("\n");
    const a = Math.max(1, range[0]);
    const b = Math.min(ls.length, range[1]);
    const box = document.createElement("div");
    box.className = "snippet";
    box.setAttribute("aria-label", linesLabel(range));
    const MAX = 14;
    for (let i = a; i <= Math.min(b, a + MAX - 1); i++) {
      const row = document.createElement("div");
      const num = document.createElement("span");
      num.textContent = i;
      const txt = document.createElement("span");
      txt.textContent = ls[i - 1] || " ";
      row.append(num, txt);
      box.appendChild(row);
    }
    if (b - a + 1 > MAX) { const more = document.createElement("span"); more.className = "more"; more.textContent = `… thêm ${b - a + 1 - MAX} dòng (xem trong khung code)`; box.appendChild(more); }
    return box;
  }

  // ───────────────────────── tour ─────────────────────────
  function updateTourUi() {
    const has = S.nodes.length > 0;
    const entry = S.selected ? S.byId.get(S.selected) : null;
    $("counter").textContent = has ? (entry ? `${entry.index + 1} / ${S.nodes.length}` : `${S.nodes.length} ô`) : "";
    $("prev").disabled = !has || (entry && entry.index === 0);
    $("next").disabled = !has || (entry && entry.index === S.nodes.length - 1);
    $("tour").disabled = !has;
    $("tour").setAttribute("aria-pressed", String(S.tour));
    $("tour").textContent = S.tour ? "■ Thoát chế độ từng bước" : "▶ Đi từng bước";
  }
  function step(dir) {
    if (!S.nodes.length) return;
    const entry = S.selected ? S.byId.get(S.selected) : null;
    let i = entry ? entry.index + dir : dir > 0 ? 0 : S.nodes.length - 1;
    i = Math.max(0, Math.min(S.nodes.length - 1, i));
    select(S.nodes[i].id);
  }
  function toggleTour() {
    S.tour = !S.tour;
    if (S.tour && !S.selected && S.nodes.length) select(S.nodes[0].id);
    else { applySelection(false); updateTourUi(); }
  }

  Object.assign(LL.app, { setFlow, renderDiagram, MIN_FIT, applyZoom, zoomBy, applySelection, select, sheetMode, boxForLine, renderExplain, whereText, snippet, updateTourUi, step, toggleTour });
})(globalThis.LL = globalThis.LL || {});
