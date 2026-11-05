/* Logic Lens — page logic. */
(function (LL) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const F = LL.flow;
  const LAY = LL.layout;

  const S = {
    code: "",
    flow: null,
    nodes: [],
    byId: new Map(),
    selected: null,
    tour: false,
    zoom: "fit",
    lang: "vi",
    detail: "normal",
    codeAtDraw: null,
    ctl: null,
    sample: undefined, // undefined = still checking, null = unavailable
    downloads: null,
    lineEls: [],
    hlRange: null,
  };

  // ───────────────────────── storage (best effort) ─────────────────────────
  const KEY = "logic-lens:v1";
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  let saveTimer = 0;
  function writeDraft() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({ code: S.code, flow: S.flow, lang: S.lang, detail: S.detail, example: $("example").value }));
    } catch (e) { /* storage unavailable: drafts just won't persist */ }
  }
  /** Debounced while typing; `now` for changes that must survive an immediate reload (a new diagram). */
  function saveDraft(now) {
    if (now) { writeDraft(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeDraft, 400);
  }

  // ───────────────────────── small helpers ─────────────────────────
  let toastTimer = 0;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand && document.execCommand("copy");
        ta.remove();
        return !!ok;
      } catch (e2) { return false; }
    }
  }
  function setStatus(text, kind) {
    const el = $("status");
    el.textContent = text || "";
    el.className = "status" + (kind ? " " + kind : "");
  }
  function linesLabel(r) {
    return r[0] === r[1] ? "Dòng " + r[0] : "Dòng " + r[0] + "–" + r[1];
  }
  async function capability(name) {
    try { return window.claude && typeof window.claude.use === "function" ? await window.claude.use(name) : null; } catch (e) { return null; }
  }

  // ───────────────────────── code panel ─────────────────────────
  function setCode(code, mode) {
    S.code = String(code || "").replace(/\r\n/g, "\n");
    $("code").value = S.code;
    buildCodeView();
    setCodeMode(mode || (S.code ? "view" : "edit"));
    updateCodeInfo();
  }
  function updateCodeInfo() {
    const n = S.code ? S.code.split("\n").length : 0;
    $("code-info").textContent = n ? `${n} dòng · ${F.guessLanguage(S.code)}` : "Dán code vào đây";
  }
  function buildCodeView() {
    const view = $("code-view");
    view.textContent = "";
    S.lineEls = [];
    S.hlRange = null;
    const frag = document.createDocumentFragment();
    S.code.split("\n").forEach((line, i) => {
      const row = document.createElement("div");
      row.className = "code-line";
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = i + 1;
      const c = document.createElement("span");
      c.className = "c";
      c.textContent = line || " ";
      row.append(n, c);
      frag.appendChild(row);
      S.lineEls.push(row);
    });
    view.appendChild(frag);
  }
  function setCodeMode(mode) {
    const editing = mode === "edit";
    $("code").hidden = !editing;
    $("code-view").hidden = editing;
    $("code-toggle").textContent = editing ? "Xem theo dòng" : "Sửa code";
    $("code-toggle").hidden = editing && !S.code;
  }
  function highlightLines(range, scroll) {
    if (S.hlRange) for (let i = S.hlRange[0]; i <= S.hlRange[1]; i++) S.lineEls[i - 1] && S.lineEls[i - 1].classList.remove("hl");
    S.hlRange = null;
    if (!range || !S.lineEls.length) return;
    const a = Math.max(1, range[0]);
    const b = Math.min(S.lineEls.length, range[1]);
    if (a > b) return;
    for (let i = a; i <= b; i++) S.lineEls[i - 1].classList.add("hl");
    S.hlRange = [a, b];
    if (scroll) {
      if (!$("code").hidden) setCodeMode("view");
      const view = $("code-view");
      const el = S.lineEls[a - 1];
      const span = S.lineEls[b - 1].offsetTop + S.lineEls[b - 1].offsetHeight - el.offsetTop;
      const top = span < view.clientHeight * 0.8 ? el.offsetTop - (view.clientHeight - span) / 3 : el.offsetTop - 24;
      view.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

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
    const lay = LAY.layout(S.flow);
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
    svg.querySelectorAll(".ll-itemg").forEach((g) => g.addEventListener("click", () => select(g.getAttribute("data-group"), { fromDiagram: true })));
    applySelection(false);
  }

  function applyZoom() {
    const canvas = $("canvas");
    const svg = canvas.querySelector("svg");
    if (!svg || !S.lay) return;
    canvas.classList.toggle("fit", S.zoom === "fit");
    if (S.zoom === "fit") { svg.style.width = ""; }
    else svg.style.width = Math.round(S.lay.width * S.zoom) + "px";
    $("zoom-fit").textContent = S.zoom === "fit" ? "Vừa khung" : Math.round(S.zoom * 100) + "%";
  }
  function zoomBy(f) {
    const canvas = $("canvas");
    const svg = canvas.querySelector("svg");
    if (!svg || !S.lay) return;
    const current = S.zoom === "fit" ? svg.getBoundingClientRect().width / S.lay.width : S.zoom;
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
        // on phones the canvas is not a scroll box: bring the diagram row into view
        const r = svg.getBoundingClientRect();
        const by = r.top + (box.y + box.h / 2) * scale;
        if (canvas.scrollHeight <= canvas.clientHeight + 2 && (by < 80 || by > window.innerHeight - 40)) window.scrollBy({ top: by - window.innerHeight / 2, behavior: "smooth" });
      }
    }
  }

  function select(id, opts) {
    const o = opts || {};
    if (!S.byId.has(id)) id = null;
    S.selected = id;
    applySelection(!o.fromDiagram);
    renderExplain();
    updateTourUi();
    const entry = id ? S.byId.get(id) : null;
    highlightLines(entry && entry.node.lines, true);
  }

  // ───────────────────────── explanation ─────────────────────────
  function renderExplain() {
    const el = $("explain");
    el.textContent = "";
    const entry = S.selected ? S.byId.get(S.selected) : null;
    $("explain-hint").textContent = entry ? "" : "bấm một ô trên sơ đồ";
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
    pos.textContent = `Ô ${entry.index + 1} / ${S.nodes.length}` + (entry.lane ? " · một nhánh" : "");
    const h = document.createElement("h3");
    h.textContent = n.title || "…";
    el.append(pos, h);
    if (n.sub) { const s = document.createElement("div"); s.className = "sub"; s.textContent = n.sub; el.appendChild(s); }
    if (n.detail) for (const para of n.detail.split("\n")) { const p = document.createElement("p"); p.textContent = para; el.appendChild(p); }
    if (n.items && n.items.length) {
      const p = document.createElement("p");
      p.textContent = "Gồm: " + n.items.map((it) => it.title + (it.sub ? " " + it.sub : "")).join(" · ");
      el.appendChild(p);
    }
    if (n.note) { const p = document.createElement("p"); p.style.color = "var(--red)"; p.textContent = n.note; el.appendChild(p); }
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

  // ───────────────────────── Claude ─────────────────────────
  const ERR = {
    not_granted: "Bạn chưa cho phép trang này dùng Claude. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    sampling_disabled: "Tài khoản này không dùng được Claude trong trang. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    rate_limited: "Đang gọi Claude quá nhiều hoặc đã chạm giới hạn sử dụng. Chờ một lúc rồi thử lại.",
    prompt_too_large: "Code quá dài cho một lần vẽ. Hãy dán một hàm hoặc một đoạn nhỏ hơn.",
    session_expired: "Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lần nữa.",
    refused: "Claude từ chối đoạn code này. Thử bỏ bớt phần nhạy cảm rồi vẽ lại.",
    invalid_json: "Claude trả lời không đúng định dạng. Bấm vẽ lại, hoặc chọn mức “Gọn”.",
    empty_completion: "Claude không trả lời gì. Thử lại với đoạn code ngắn hơn.",
    upstream_error: "Kết nối tới Claude bị gián đoạn. Thử lại.",
  };

  async function draw() {
    const code = $("code").hidden ? S.code : $("code").value;
    S.code = code.replace(/\r\n/g, "\n");
    if (!S.code.trim()) { setStatus("Chưa có code. Dán code vào khung bên trên trước.", "err"); return; }
    if (S.sample === undefined) { setStatus("Đang kết nối Claude…", "busy"); S.sample = await capability("sample"); }
    if (!S.sample) {
      setStatus("Trang này không gọi trực tiếp được Claude. Dùng cách bên dưới: copy prompt sang Claude rồi dán câu trả lời về.", "err");
      $("alt").open = true;
      return;
    }
    const prompt = F.buildPrompt(S.code, { language: S.lang, detail: S.detail });
    if (new Blob([prompt]).size > 250000) { setStatus(ERR.prompt_too_large, "err"); return; }
    S.ctl = new AbortController();
    $("draw").disabled = true;
    $("stop").hidden = false;
    setStatus("Claude đang đọc code… (thường mất 20–60 giây)", "busy");
    const started = Date.now();
    try {
      const result = await S.sample.json(prompt, {
        signal: S.ctl.signal,
        modelTier: "default",
        onText: ({ text }) => setStatus(`Claude đang viết sơ đồ… ${text.length.toLocaleString("vi-VN")} ký tự`, "busy"),
      });
      const flow = F.normalize(result);
      if (!flow.steps.length) throw { code: "invalid_json" };
      buildCodeView();
      S.codeAtDraw = S.code;
      S.selected = null;
      S.tour = false;
      $("example").value = "";
      setFlow(flow);
      setCodeMode("view");
      setStatus(`Xong sau ${Math.round((Date.now() - started) / 1000)} giây: ${S.nodes.length} ô. Bấm vào ô để xem giải thích.`);
    } catch (e) {
      const code = e && e.code;
      if (code === "cancelled") setStatus("Đã dừng.");
      else {
        setStatus(ERR[code] || ERR.upstream_error, "err");
        if (code === "not_granted" || code === "sampling_disabled" || code === "capability_disabled" || code === "not_declared") { S.sample = null; $("alt").open = true; }
      }
    } finally {
      $("draw").disabled = false;
      $("stop").hidden = true;
      S.ctl = null;
    }
  }

  // ───────────────────────── exports ─────────────────────────
  function svgForExport() {
    if (!S.flow || !S.flow.steps.length) return null;
    // exported files always use the light palette (the fallbacks inside the SVG's own style block)
    return LAY.toSvg(S.flow, S.lay || LAY.layout(S.flow), { interactive: false, background: "#ffffff" });
  }
  function fileBase() {
    const t = (S.flow && S.flow.title) || "so-do";
    return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "so-do";
  }
  async function saveFile(filename, data) {
    if (!S.downloads) return;
    try {
      await S.downloads.save({ filename, data });
    } catch (e) {
      if (e && e.code !== "declined") toast("Không tải được file ở đây.");
    }
  }
  async function downloadPng() {
    const svg = svgForExport();
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = S.lay.width * scale;
      c.height = S.lay.height * scale;
      const ctx = c.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, S.lay.width, S.lay.height);
      const png = await new Promise((res) => c.toBlob(res, "image/png"));
      if (png) await saveFile(fileBase() + ".png", png);
    } catch (e) {
      toast("Không tạo được ảnh PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ───────────────────────── wiring ─────────────────────────
  function segment(id, key) {
    const seg = $(id);
    const sync = () => seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S[key])));
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      S[key] = b.dataset.v;
      sync();
      saveDraft();
    });
    return sync;
  }

  function loadExample(id) {
    const ex = LL.sample.getExample(id);
    setCode(ex.code, "view");
    S.codeAtDraw = ex.code;
    S.selected = null;
    S.tour = false;
    setFlow(ex.flow);
    setStatus(`Ví dụ có sẵn sơ đồ. Thử sửa code rồi bấm “Vẽ sơ đồ bằng Claude” để Claude vẽ lại.`);
  }

  function boot() {
    LAY.setMeasure(LAY.browserMeasure());

    const exSel = $("example");
    exSel.appendChild(new Option("Code của bạn", ""));
    for (const ex of LL.sample.EXAMPLES) exSel.appendChild(new Option(ex.name, ex.id));
    exSel.addEventListener("change", () => { if (exSel.value) loadExample(exSel.value); });

    const syncLang = segment("lang-seg", "lang");
    const syncDetail = segment("detail-seg", "detail");

    const code = $("code");
    let codeTimer = 0;
    code.addEventListener("input", () => {
      S.code = code.value.replace(/\r\n/g, "\n");
      $("example").value = "";
      updateCodeInfo();
      clearTimeout(codeTimer);
      codeTimer = setTimeout(() => { buildCodeView(); saveDraft(); }, 300);
    });
    $("code-toggle").addEventListener("click", () => {
      if ($("code").hidden) { setCodeMode("edit"); $("code").focus(); }
      else { S.code = code.value.replace(/\r\n/g, "\n"); buildCodeView(); setCodeMode("view"); if (S.selected) highlightLines(S.byId.get(S.selected).node.lines, true); }
    });

    $("draw").addEventListener("click", draw);
    $("stop").addEventListener("click", () => S.ctl && S.ctl.abort());
    $("copy-prompt").addEventListener("click", async () => {
      const c = $("code").hidden ? S.code : $("code").value;
      if (!c.trim()) { toast("Chưa có code để tạo prompt."); return; }
      const ok = await copyText(F.buildPrompt(c, { language: S.lang, detail: S.detail }));
      toast(ok ? "Đã copy prompt. Dán vào Claude, rồi dán câu trả lời vào ô bên dưới." : "Trình duyệt chặn copy.");
    });
    $("use-reply").addEventListener("click", () => {
      const r = F.parseReply($("reply").value);
      if (!r.flow) { setStatus(r.error, "err"); return; }
      S.code = $("code").hidden ? S.code : $("code").value;
      buildCodeView();
      S.codeAtDraw = S.code;
      S.selected = null;
      $("example").value = "";
      setFlow(r.flow);
      setCodeMode("view");
      setStatus(`Đã vẽ từ câu trả lời: ${S.nodes.length} ô.`);
    });

    $("tour").addEventListener("click", toggleTour);
    $("prev").addEventListener("click", () => step(-1));
    $("next").addEventListener("click", () => step(1));
    $("zoom-in").addEventListener("click", () => zoomBy(1.2));
    $("zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
    $("zoom-fit").addEventListener("click", () => { S.zoom = "fit"; applyZoom(); });
    $("copy-mermaid").addEventListener("click", async () => {
      if (!S.flow) return;
      const ok = await copyText(F.toMermaid(S.flow));
      toast(ok ? "Đã copy Mermaid. Dán vào GitHub, Notion hoặc Obsidian trong khối ```mermaid." : "Trình duyệt chặn copy.");
    });
    $("copy-dsl").addEventListener("click", async () => {
      const ok = await copyText($("dsl").value);
      toast(ok ? "Đã copy sơ đồ dạng chữ." : "Trình duyệt chặn copy.");
    });
    $("dl-svg").addEventListener("click", () => { const s = svgForExport(); if (s) saveFile(fileBase() + ".svg", s); });
    $("dl-png").addEventListener("click", downloadPng);

    let dslTimer = 0;
    $("dsl").addEventListener("input", () => {
      clearTimeout(dslTimer);
      dslTimer = setTimeout(() => {
        const { flow, errors } = F.parseText($("dsl").value);
        const ul = $("dsl-errors");
        ul.textContent = "";
        for (const e of errors.slice(0, 8)) { const li = document.createElement("li"); li.textContent = (e.line ? "Dòng " + e.line + ": " : "") + e.message; ul.appendChild(li); }
        setFlow(flow, { fromText: true });
      }, 300);
    });

    // keyboard: ← → move between boxes, Esc leaves the step-by-step mode
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" && S.tour) { if (S.nodes.length) { e.preventDefault(); step(1); } }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" && S.tour) { if (S.nodes.length) { e.preventDefault(); step(-1); } }
      else if (e.key === "Escape" && (S.tour || S.selected)) { S.tour = false; select(null); }
    });

    window.addEventListener("pagehide", () => { if (saveTimer) writeDraft(); });

    // theme
    const themeBtn = $("theme");
    const isDark = () => { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
    const paintTheme = () => { themeBtn.textContent = isDark() ? "☀" : "☾"; };
    try { const t = localStorage.getItem("logic-lens:theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch (e) { /* ignore */ }
    paintTheme();
    themeBtn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("logic-lens:theme", next); } catch (e) { /* ignore */ }
      paintTheme();
    });

    // start: the viewer's draft, else the first example
    const draft = loadDraft();
    if (draft && (draft.code || (draft.flow && draft.flow.steps && draft.flow.steps.length))) {
      if (draft.lang === "en" || draft.lang === "vi") S.lang = draft.lang;
      if (["simple", "normal", "detailed"].includes(draft.detail)) S.detail = draft.detail;
      syncLang(); syncDetail();
      if (draft.example) { exSel.value = draft.example; loadExample(draft.example); }
      else {
        setCode(draft.code || "", draft.code ? "view" : "edit");
        S.codeAtDraw = S.code;
        setFlow(draft.flow ? F.normalize(draft.flow) : null);
        exSel.value = "";
      }
    } else {
      exSel.value = LL.sample.EXAMPLES[0].id;
      loadExample(exSel.value);
    }

    // re-measure once web fonts arrive
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { LAY.setMeasure(LAY.browserMeasure()); renderDiagram(); });

    // capabilities light up later; the page works without them
    capability("sample").then((s) => {
      S.sample = s;
      if (!s) {
        $("draw").title = "Trang này không gọi trực tiếp được Claude";
        $("alt").open = true;
      }
    });
    capability("downloads").then((d) => {
      S.downloads = d;
      $("dl-svg").hidden = !d;
      $("dl-png").hidden = !d;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  LL.app = { _state: S, select, setFlow };
})(globalThis.LL = globalThis.LL || {});
