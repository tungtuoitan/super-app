/* Logic Lens — the diagram on the page: drawing, zoom, selection, the explanation card, the step-by-step tour. */
(function (LL) {
  "use strict";

  const { S, $, F, LAY, saveDraft, linesLabel, diagramEditor, toast } = LL.app;
  const MIN_FIT = 0.74; // below this the text is too small to read: scroll sideways instead
  const CHANGE_TEXT = { added: "Thêm mới", modified: "Đã sửa", removed: "Đã xoá" };

  // ───────────────────────── diagram ─────────────────────────
  function setFlow(flow, opts) {
    const o = opts || {};
    S.flow = flow;
    if (flow && S.cmp && !o.fromText) LL.diff.reconcileChanges(flow, S.cmp);
    S.nodes = flow ? F.walkNodes(flow) : [];
    S.byId = new Map(S.nodes.map((x, i) => [x.id, Object.assign({ index: i }, x)]));
    if (!S.byId.has(S.selected)) S.selected = null;
    if (!S.selected) { $("explain-card").hidden = true; $("pane-canvas").classList.remove("card-on"); }
    $("d-title").textContent = flow && flow.title ? flow.title : flow && flow.steps.length ? "Sơ đồ" : "Chưa có sơ đồ";
    $("d-summary").textContent = flow && flow.summary ? flow.summary : "";
    renderChangeBar();
    if (!o.fromText) { $("dsl").value = flow ? F.toText(flow) : ""; $("dsl-errors").textContent = ""; }
    renderDiagram();
    renderExplain();
    updateTourUi();
    saveDraft(!o.fromText);
    LL.app.emit("flow");
  }

  function changedNodes() {
    return S.nodes.filter((x) => x.node.change);
  }

  function renderChangeBar() {
    const bar = $("change-bar");
    bar.textContent = "";
    const ch = changedNodes();
    if (!S.flow || (!ch.length && !S.flow.changeSummary)) { bar.hidden = true; return; }
    bar.hidden = false;
    if (S.flow.changeSummary) { const p = document.createElement("div"); p.className = "cs"; p.textContent = S.flow.changeSummary; bar.appendChild(p); }
    for (const k of ["added", "modified", "removed"]) {
      const n = ch.filter((x) => x.node.change === k).length;
      if (!n) continue;
      const pill = document.createElement("span");
      pill.className = "pill " + k;
      pill.textContent = `${k === "added" ? "+" : k === "modified" ? "✎" : "−"} ${n} ${CHANGE_TEXT[k].toLowerCase()}`;
      bar.appendChild(pill);
    }
  }

  function renderDiagram() {
    const canvas = $("canvas");
    if (!S.flow || !S.flow.steps.length) {
      canvas.innerHTML = '<div class="empty"><b>Chưa có sơ đồ</b>Dán code vào khung bên trái rồi bấm “Vẽ sơ đồ”, hoặc mở một ví dụ ở góc trên.</div>';
      S.lay = null;
      return;
    }
    S.narrow = canvas.clientWidth > 0 && canvas.clientWidth < 600;
    // on narrow screens draw at the real width so text stays at its true size
    S.lay = LAY.layout(S.flow, S.narrow ? { narrow: true, width: Math.max(320, canvas.clientWidth - 16) } : {});
    canvas.innerHTML = LAY.toSvg(S.flow, S.lay, { interactive: true });
    const svg = canvas.firstElementChild;
    svg.querySelectorAll(".ll-node").forEach((g) => {
      g.addEventListener("click", () => select(g.getAttribute("data-id"), { fromDiagram: true }));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(g.getAttribute("data-id"), { fromDiagram: true }); } });
    });
    svg.querySelectorAll(".ll-itemg").forEach((g) => g.addEventListener("click", () => {
      select(g.getAttribute("data-group"), { fromDiagram: true });
      const r = (g.getAttribute("data-lines") || "").split("-").map(Number);
      if (r.length === 2 && r[0]) diagramEditor().setRange(liveRange(r), true);
    }));
    applyZoom();
    applySelection(false);
    LL.app.emit("render");
  }

  function applyZoom() {
    const canvas = $("canvas");
    const svg = canvas.querySelector("svg");
    if (!svg || !S.lay) return;
    const cs = getComputedStyle(canvas);
    const cardOn = $("pane-canvas").classList.contains("card-on") && !S.narrow && parseFloat(cs.paddingRight) > 100;
    const avail = Math.max(200, canvas.clientWidth - parseFloat(cs.paddingLeft) - (cardOn ? parseFloat(cs.paddingLeft) : parseFloat(cs.paddingRight)));
    const fit = Math.min(1100, avail) / S.lay.width;
    let scale = null;
    if (typeof S.zoom === "number") scale = S.zoom;
    else if (S.zoom === "auto" && fit < MIN_FIT && !S.narrow) scale = MIN_FIT;
    // the open card adds room to scroll into instead of shrinking the diagram
    const shrunk = scale != null; // shown bigger than "fit" so it stays readable
    if (scale == null && cardOn) {
      // shrink toward the readable minimum so less is cut off, but never below what fits beside the card
      const full = Math.min(1100, avail) / S.lay.width;
      const beside = Math.max(200, canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / S.lay.width;
      scale = Math.max(beside, Math.min(full, MIN_FIT));
    }
    canvas.classList.toggle("fit", scale == null);
    svg.style.width = scale == null ? "" : Math.round(S.lay.width * scale) + "px";
    svg.style.maxWidth = scale == null ? "" : "none";
    const btn = $("zoom-fit");
    btn.textContent = typeof S.zoom === "number" ? Math.round(S.zoom * 100) + "%" : shrunk ? "Xem toàn bộ" : S.zoom === "all" ? "Cỡ dễ đọc" : "Vừa khung";
    if (canvas.scrollWidth > canvas.clientWidth + 2) {
      if (S.selected) applySelection(true);
      else canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2;
    }
  }
  function zoomBy(f) {
    const svg = $("canvas").querySelector("svg");
    if (!svg || !S.lay) return;
    const current = typeof S.zoom === "number" ? S.zoom : svg.getBoundingClientRect().width / S.lay.width;
    S.zoom = Math.min(2.5, Math.max(0.35, Math.round(current * f * 20) / 20));
    applyZoom();
  }
  function toggleFit() {
    const svg = $("canvas").querySelector("svg");
    const shrunk = svg && S.lay && $("canvas").classList.contains("fit") === false && typeof S.zoom !== "number";
    S.zoom = typeof S.zoom === "number" ? "auto" : S.zoom === "all" ? "auto" : shrunk ? "all" : "auto";
    applyZoom();
  }

  // ───────────────────────── selection ─────────────────────────
  function tourList() {
    const hidden = new Set((S.lay && S.lay.hidden) || []); // an empty path drawn as a line, not a box
    return (S.onlyChanges && changedNodes().length ? changedNodes() : S.nodes).filter((x) => !hidden.has(x.id));
  }

  function applySelection(scrollIntoView) {
    const svg = $("canvas").querySelector("svg");
    if (!svg) return;
    const inTour = new Set(S.tour ? tourList().map((x) => x.id) : []);
    svg.querySelectorAll(".ll-node").forEach((g) => {
      const id = g.getAttribute("data-id");
      const on = id === S.selected;
      g.classList.toggle("sel", on);
      g.classList.toggle("hl", on && S.tour);
      g.classList.toggle("dim", S.tour && !on && (S.selected != null || S.onlyChanges) && !(S.onlyChanges && inTour.has(id) && !S.selected));
      g.setAttribute("aria-pressed", String(on));
    });
    svg.querySelectorAll(".ll-itemg").forEach((g) => g.classList.toggle("dim", S.tour && S.selected != null && g.getAttribute("data-group") !== S.selected));
    LL.app.emit("paint");
    if (scrollIntoView && S.selected) scrollToBox(S.selected);
  }

  /** Scroll the canvas so a box sits in the part of it the card does not cover. */
  function scrollToBox(id) {
    const svg = $("canvas").querySelector("svg");
    if (svg && S.lay) {
      const box = S.lay.boxes.find((b) => b.id === id);
      const canvas = $("canvas");
      if (!box) return;
      const scale = svg.getBoundingClientRect().width / S.lay.width;
      const sr = svg.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      const cardOpen = !$("explain-card").hidden;
      const sheet = window.matchMedia("(max-width: 900px)").matches;
      // keep the box clear of the explanation card (right side on desktop, bottom sheet on phones)
      const visW = canvas.clientWidth - (cardOpen && !sheet ? parseFloat(getComputedStyle(canvas).paddingRight) : 0);
      const visH = canvas.clientHeight * (cardOpen && sheet ? (S.run ? 0.58 : 0.48) : 1);
      const x = sr.left - cr.left + canvas.scrollLeft + (box.x + box.w / 2) * scale;
      const y = sr.top - cr.top + canvas.scrollTop + (box.y + box.h / 2) * scale;
      canvas.scrollTo({ left: Math.max(0, x - visW / 2), top: Math.max(0, y - visH * (sheet ? 0.45 : 0.4)), behavior: "smooth" });
    }
  }

  function select(id, opts) {
    const o = opts || {};
    if (!S.byId.has(id)) id = null;
    S.selected = id;
    const wasOpen = !$("explain-card").hidden;
    $("explain-card").hidden = !id;
    // desktop: the diagram makes room for the card instead of hiding under it
    $("pane-canvas").classList.toggle("card-on", !!id);
    if (wasOpen !== !!id) applyZoom();
    applySelection(true);
    renderExplain();
    updateTourUi();
    const entry = id ? S.byId.get(id) : null;
    diagramEditor().setRange(entry && liveRange(entry.node.lines), !o.fromCode);
    if (id && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("ll-node")) {
      const g = $("canvas").querySelector(`.ll-node[data-id="${CSS.escape(id)}"]`);
      if (g && g !== document.activeElement) g.focus({ preventScroll: true });
    }
  }

  /** A box's line range in the code as it is now: edits made after drawing shift it (null if its lines are gone). */
  let liveCache = null;
  function liveRange(r) {
    if (!r) return null;
    const now = LL.app.diagramCode();
    if (S.codeAtDraw == null || S.codeAtDraw === now) return r;
    if (!liveCache || liveCache.from !== S.codeAtDraw || liveCache.to !== now) {
      const map = [];
      for (const l of LL.diff.compare(S.codeAtDraw, now).listing) if (l.type === "eq") map[l.oldLine] = l.newLine;
      liveCache = { from: S.codeAtDraw, to: now, map };
    }
    let a = null;
    let b = null;
    for (let i = r[0]; i <= r[1]; i++) if (liveCache.map[i]) { if (a == null) a = liveCache.map[i]; b = liveCache.map[i]; }
    return a == null ? null : [a, b];
  }

  /** Smallest box whose line range contains this code line. */
  function boxForLine(line) {
    let best = null;
    for (const e of S.nodes) {
      const r = liveRange(e.node.lines);
      if (!r || line < r[0] || line > r[1] || e.node.change === "removed") continue;
      const span = r[1] - r[0];
      if (!best || span < best.span || (span === best.span && e.path.length > best.e.path.length)) best = { e, span };
    }
    return best && best.e;
  }

  // ───────────────────────── explanation card ─────────────────────────
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function whereText(entry) {
    const parts = [];
    for (const p of entry.path || []) {
      if (p.section != null) parts.push("Phần “" + p.section + "”");
      else if (p.loop != null) parts.push("Trong vòng lặp “" + p.loop + "”");
      else parts.push(`${p.branchTitle ? p.branchTitle + ": " : ""}${p.parallel ? "song song" : "nhánh"} ${p.laneIndex + 1}/${p.laneCount} “${p.lane}”`);
    }
    if (entry.lane) parts.push(entry.parallel ? "chạy cùng lúc với các nhánh song song khác" : "chỉ chạy khi rơi vào trường hợp này");
    return parts.join(" › ");
  }

  /** Code lines of a box; with a change, the removed lines are shown struck through where they used to be. */
  function snippet(range, removedBox) {
    const box = el("div", "snippet");
    const ls = LL.app.diagramCode().split("\n");
    const rows = S.cmp ? LL.diff.listingFor(S.cmp, range, removedBox) : [];
    const list = rows.length ? rows : Array.from({ length: Math.max(0, Math.min(ls.length, range[1]) - range[0] + 1) }, (_, i) => ({ type: "eq", newLine: range[0] + i, text: ls[range[0] + i - 1] }));
    const MAX = 18;
    list.slice(0, MAX).forEach((r) => {
      const row = el("div", r.type === "add" ? "d-add" : r.type === "del" ? "d-del" : "");
      row.append(el("span", "", r.type === "del" ? "" : String(r.newLine)), el("span", "", r.type === "add" ? "+" : r.type === "del" ? "−" : ""), el("span", "", r.text || " "));
      box.appendChild(row);
    });
    if (list.length > MAX) box.appendChild(el("span", "more", `… thêm ${list.length - MAX} dòng (xem trong khung code)`));
    return box;
  }

  function renderExplain() {
    const box = $("explain");
    box.textContent = "";
    const entry = S.selected ? S.byId.get(S.selected) : null;
    if (!entry) return;
    const n = entry.node;
    const list = tourList();
    const pos = list.findIndex((x) => x.id === entry.id);
    $("explain-pos").textContent = S.onlyChanges && pos >= 0 ? `Thay đổi ${pos + 1} / ${list.length}` : `Ô ${entry.index + 1} / ${S.nodes.length}`;
    const crumb = whereText(entry);
    if (crumb) box.appendChild(el("div", "crumb", crumb));
    box.appendChild(el("h3", "", n.title || (entry.lane ? "Nhánh" : "…")));
    if (n.sub) box.appendChild(el("div", "sub", n.sub));
    if (n.change) {
      const cb = el("div", "changebox " + n.change);
      cb.appendChild(el("b", "", (n.change === "added" ? "+ " : n.change === "modified" ? "✎ " : "− ") + CHANGE_TEXT[n.change].toUpperCase()));
      cb.appendChild(el("div", "", n.changeNote || (n.changeAuto ? "Các dòng code của ô này đã thay đổi (phát hiện từ diff)." : "")));
      box.appendChild(cb);
    }
    if (n.detail) for (const para of n.detail.split("\n")) box.appendChild(el("p", "", para));
    if (n.items && n.items.length) box.appendChild(el("p", "", "Gồm: " + n.items.map((it) => it.title + (it.sub ? " " + it.sub : "")).join(" · ")));
    if (n.note) { const p = el("p", "", n.note); p.style.color = "var(--del)"; box.appendChild(p); }
    const KIND_NOTE = {
      start: n.tag === "USER" ? "Người dùng thao tác: luồng này bắt đầu từ đây." : "Điểm bắt đầu: thứ kích hoạt luồng này.",
      call: "Gọi sang một hàm hoặc dịch vụ khác; bên trong nó không vẽ ở đây.",
      loop: `Các bước trong khung được lặp lại (${(n.steps || []).length} bước).`,
      section: "Một điểm vào độc lập của cùng đoạn code.",
    };
    if (n.kind === "end") box.appendChild(el("p", "", { throw: "Ném lỗi: đường đi dừng ở đây.", break: "Thoát khỏi vòng lặp.", continue: "Bỏ qua phần còn lại, sang vòng lặp kế tiếp.", respond: "Trả phản hồi và dừng xử lý.", exit: "Thoát chương trình.", navigate: "Chuyển sang trang khác: luồng trên trang này dừng ở đây.", back: "Về lại màn hình; người dùng chọn thao tác tiếp theo.", stay: "Vẫn ở hộp thoại / form đó; người dùng thử lại hoặc chọn nút khác." }[n.exit] || "Trả về: đường đi dừng ở đây."));
    else if (KIND_NOTE[n.kind]) box.appendChild(el("p", "hint-empty", KIND_NOTE[n.kind]));
    const inside = sectionFor(n, entry.id);
    if (inside) {
      const b = el("button", "btn sm", "↪ Xem bên trong: " + (inside.node.title || "…"));
      b.type = "button";
      b.addEventListener("click", () => select(inside.id));
      box.appendChild(b);
    }
    const tags = el("div", "tags");
    if (n.tag) tags.appendChild(el("span", "tag", n.tag));
    if (n.kind === "stage" || n.kind === "group") tags.appendChild(el("span", "tag stage", "Giai đoạn chính"));
    if (n.attention && !n.unreachable) tags.appendChild(el("span", "tag attn", "Đáng chú ý"));
    if (n.unreachable) tags.appendChild(el("span", "tag attn", "Không bao giờ chạy tới"));
    const live = liveRange(n.lines);
    if (live) {
      const t = el("span", "tag lines", linesLabel(live));
      t.setAttribute("role", "button");
      t.tabIndex = 0;
      t.title = "Hiện các dòng này trong khung code";
      const go = () => { LL.app.showPane && LL.app.showPane("code"); diagramEditor().setRange(live, true); };
      t.addEventListener("click", go);
      t.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      tags.appendChild(t);
    }
    if (tags.childNodes.length) box.appendChild(tags);
    if (live) box.appendChild(snippet(live, n.change === "removed"));
    else if (n.lines) box.appendChild(el("p", "hint-empty", "Các dòng code của ô này đã bị sửa hoặc xoá sau khi vẽ. Bấm vẽ lại để cập nhật."));
    if (live && S.codeAtDraw != null && S.codeAtDraw !== LL.app.diagramCode()) box.appendChild(el("p", "hint-empty", "Code đã sửa sau khi vẽ; số dòng đã được dời theo. Bấm vẽ lại nếu logic thay đổi."));
  }

  /** A call into a function that has its own section in this diagram (recursion, a helper, a handler): that section. */
  function sectionFor(n, selfId) {
    if (n.kind !== "call" && n.kind !== "step") return null;
    // the function names in the title: "visit(dep)", or a bare identifier like fetch_json / loadUser
    const title = String(n.title || "");
    const names = new Set();
    for (const m of title.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1].toLowerCase());
    for (const m of title.matchAll(/\b([a-z_$][\w$]*(?:_[\w$]+|[a-z][A-Z][\w$]*))\b/g)) names.add(m[1].toLowerCase());
    if (!names.size) return null;
    const starts = (hay, name) => new RegExp("(^|[^\\w$])" + name.replace(/\$/g, "\\$") + "\\s*(\\(|$|\\s)").test(hay);
    for (const e of S.nodes) {
      if (e.node.kind !== "section" || selfId.startsWith(e.id + ".")) continue;
      const first = (e.node.steps || [])[0];
      const hay = [e.node.title, e.node.sub, first && first.title].join(" ").toLowerCase();
      for (const name of names) if (starts(hay, name)) return e;
    }
    return null;
  }

  // ───────────────────────── tour ─────────────────────────
  function updateTourUi() {
    const list = tourList();
    const has = list.length > 0;
    const i = list.findIndex((x) => x.id === S.selected);
    $("counter").textContent = has ? (i >= 0 ? `${i + 1} / ${list.length}` : `${list.length} ${S.onlyChanges ? "chỗ" : "ô"}`) : "";
    $("prev").disabled = $("card-prev").disabled = !has || i === 0;
    $("next").disabled = $("card-next").disabled = !has || i === list.length - 1;
    $("tour").disabled = !has;
    $("tour").setAttribute("aria-pressed", String(S.tour));
    $("tour").textContent = S.tour ? "Thoát từng bước" : "Đi từng bước";
  }
  function step(dir) {
    const list = tourList();
    if (!list.length) return;
    const i = list.findIndex((x) => x.id === S.selected);
    const j = i < 0 ? (dir > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + dir));
    select(list[j].id);
  }
  function toggleTour() {
    S.tour = !S.tour;
    if (S.tour && (!S.selected || !tourList().some((x) => x.id === S.selected))) step(1);
    else { applySelection(false); updateTourUi(); }
  }
  function setOnlyChanges(on) {
    S.onlyChanges = !!on;
    if (S.onlyChanges && !changedNodes().length) toast("Sơ đồ này chưa có ô nào được đánh dấu thay đổi.");
    if (S.onlyChanges && S.selected && !tourList().some((x) => x.id === S.selected)) S.selected = null;
    if (S.onlyChanges && !S.tour) S.tour = true;
    if (S.tour && !S.selected) step(1);
    else { applySelection(false); updateTourUi(); renderExplain(); }
  }

  Object.assign(LL.app, { scrollToBox, setFlow, renderDiagram, applyZoom, zoomBy, toggleFit, applySelection, select, boxForLine, renderExplain, updateTourUi, step, toggleTour, setOnlyChanges, changedNodes, MIN_FIT });
})(globalThis.LL = globalThis.LL || {});
