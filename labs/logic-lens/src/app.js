/* Logic Lens — asking Claude (code or code change), examples, exports, and wiring the page together (boot). */
(function (LL) {
  "use strict";

  const { S, $, F, LAY, toast, copyText, setStatus, capability, loadDraft, saveDraft, flushDraft, createEditors, diagramCode, diagramEditor, refreshChange, updateCodeInfo, showTab, setMode } = LL.app;
  const { setFlow, renderDiagram, applyZoom, zoomBy, toggleFit, select, boxForLine, renderExplain, step, toggleTour, setOnlyChanges } = LL.app;

  const ERR = {
    not_granted: "Bạn chưa cho phép trang này dùng Claude. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    sampling_disabled: "Tài khoản này không dùng được Claude trong trang. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    capability_disabled: "Claude không dùng được trong cửa sổ này. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    not_declared: "Trang này không còn được phép gọi Claude. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    rate_limited: "Đang gọi Claude quá nhiều hoặc đã chạm giới hạn sử dụng. Chờ một lúc rồi thử lại.",
    prompt_too_large: "Code quá dài cho một lần vẽ. Hãy dán một hàm hoặc một đoạn nhỏ hơn.",
    session_expired: "Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lần nữa.",
    refused: "Claude từ chối đoạn code này. Thử bỏ bớt phần nhạy cảm rồi vẽ lại.",
    invalid_json: "Claude trả lời không đúng định dạng. Bấm vẽ lại, hoặc chọn mức “Gọn”.",
    bad_shape: "Claude trả về sơ đồ sai cấu trúc. Bấm vẽ lại, hoặc chọn mức “Gọn”.",
    empty_completion: "Claude không trả lời gì. Thử lại với đoạn code ngắn hơn.",
    upstream_error: "Kết nối tới Claude bị gián đoạn. Thử lại.",
  };
  const NO_CLAUDE = { not_granted: 1, sampling_disabled: 1, capability_disabled: 1, not_declared: 1 };

  /** The prompt for what is on screen now, or an error message. */
  function promptNow() {
    const code = diagramCode();
    if (!code.trim()) return { error: S.mode === "change" ? "Chưa có code Sau. Dán code sau khi sửa (hoặc dán git diff)." : "Chưa có code. Dán code vào khung bên trái trước." };
    if (S.mode === "change") {
      if (!S.ed.before.getValue().trim()) return { error: "Chưa có code Trước. Dán code trước khi sửa, hoặc dùng “Dán git diff”." };
      const cmp = refreshChange();
      if (!cmp || !cmp.stats.changed) return { error: "Code Trước và Sau giống hệt nhau: chưa có thay đổi nào để vẽ." };
    }
    return { code, prompt: F.buildPrompt(code, { language: S.lang, detail: S.detail, change: S.mode === "change" ? S.cmp : null }) };
  }

  function drawn(flow, startedMsg) {
    S.codeAtDraw = diagramCode();
    S.selected = null;
    S.tour = false;
    $("example").value = "";
    setFlow(flow);
    updateCodeInfo();
    setStatus(startedMsg);
    showPane("canvas");
  }

  async function draw() {
    const p = promptNow();
    if (p.error) { setStatus(p.error, "err"); return; }
    if (S.sample === undefined) { setStatus("Đang kết nối Claude…", "busy"); S.sample = await capability("sample"); }
    if (!S.sample) {
      setStatus("Trang này không gọi trực tiếp được Claude. Dùng cách bên dưới: copy prompt sang Claude rồi dán câu trả lời về.", "err");
      $("alt").open = true;
      return;
    }
    if (new Blob([p.prompt]).size > 250000) { setStatus(ERR.prompt_too_large, "err"); return; }
    S.ctl = new AbortController();
    $("draw").disabled = true;
    $("stop").hidden = false;
    const n = p.code.split("\n").length;
    setStatus(n > 400 ? `Claude đang đọc ${n} dòng code… Code dài: sơ đồ sẽ chỉ giữ luồng chính. (thường mất 30–90 giây)` : "Claude đang đọc code và tìm các bước chính… (thường mất 20–60 giây)", "busy");
    const started = Date.now();
    try {
      const result = await S.sample.json(p.prompt, {
        signal: S.ctl.signal,
        modelTier: "default",
        onText: ({ text }) => {
          const titles = [...text.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).slice(1);
          setStatus(titles.length ? `Claude đã thấy ${titles.length} bước: ${titles.slice(-5).join(" · ")}…` : "Claude đang viết sơ đồ…", "busy");
        },
      });
      let flow;
      try { flow = F.normalize(result); } catch (err) { throw { code: "bad_shape" }; }
      if (!flow.steps.length) throw { code: "bad_shape" };
      const limit = { simple: 10, normal: 18, detailed: 28 }[S.detail] || 18;
      const secs = Math.round((Date.now() - started) / 1000);
      drawn(flow, `Xong sau ${secs} giây: ${F.countBoxes(flow)} ô. Bấm vào ô để xem giải thích.` + (F.countBoxes(flow) > limit * 1.5 ? " Sơ đồ khá dày: thử mức “Gọn” hoặc dán từng hàm." : ""));
    } catch (e) {
      const code = e && e.code;
      if (code === "cancelled") setStatus("Đã dừng.");
      else {
        setStatus(ERR[code] || ERR.upstream_error, "err");
        if (NO_CLAUDE[code]) { S.sample = null; $("alt").open = true; }
      }
    } finally {
      $("draw").disabled = false;
      $("stop").hidden = true;
      S.ctl = null;
    }
  }

  // ───────────────────────── examples ─────────────────────────
  function allExamples() {
    const own = LL.sample.EXAMPLES.map((e) => ({ id: e.id, name: e.name, group: "code" }));
    const corpus = (LL.corpus || []).map((e) => ({ id: e.id, name: e.name, group: e.group }));
    return own.concat(corpus);
  }
  /** Switching mode for an example keeps the diagram of the mode being left, like the mode buttons do. */
  function parkFor(mode) {
    if (mode !== S.mode) S.parked[S.mode] = S.flow ? { flow: S.flow, codeAtDraw: S.codeAtDraw } : null;
    S.parked[mode] = null;
  }
  function loadExample(id) {
    const own = LL.sample.EXAMPLES.find((e) => e.id === id);
    const target = own ? "code" : ((LL.corpus || []).find((e) => e.id === id) || {}).group === "change" ? "change" : "code";
    parkFor(target);
    if (own) {
      const ex = LL.sample.getExample(id);
      setMode("code");
      S.ed.code.setValue(ex.code);
      afterExample(F.normalize(ex.flow), ex.code);
      return;
    }
    const ex = (LL.corpus || []).find((e) => e.id === id);
    if (!ex) return;
    if (ex.group === "change") {
      setMode("change");
      S.ed.before.setValue(ex.before);
      S.ed.after.setValue(ex.after);
      refreshChange();
      afterExample(F.normalize(ex.flow), ex.after);
    } else {
      setMode("code");
      S.ed.code.setValue(ex.code);
      afterExample(F.normalize(ex.flow), ex.code);
    }
  }
  function afterExample(flow, code) {
    S.codeAtDraw = code;
    S.selected = null;
    S.tour = false;
    S.onlyChanges = false;
    $("only-changes").checked = false;
    updateCodeInfo();
    setFlow(flow);
    setStatus(S.mode === "change" ? "Ví dụ có sẵn sơ đồ thay đổi. Bấm vào ô có nhãn + / ~ / − để xem đã đổi gì." : "Ví dụ có sẵn sơ đồ. Thử sửa code rồi bấm “Vẽ sơ đồ” để Claude vẽ lại.");
  }

  // ───────────────────────── exports, legend, diff dialog ─────────────────────────
  function svgForExport() {
    return S.flow && S.flow.steps.length ? LAY.toSvg(S.flow, LAY.layout(S.flow), { interactive: false, background: "#ffffff" }) : null;
  }
  function fileBase() {
    const t = (S.flow && S.flow.title) || "so-do";
    return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "so-do";
  }
  async function saveFile(filename, data) {
    if (!S.downloads) return;
    try { await S.downloads.save({ filename, data }); } catch (e) { if (e && e.code !== "declined") toast("Không tải được file ở đây."); }
  }
  async function downloadPng() {
    const svg = svgForExport();
    if (!svg) return;
    const lay = LAY.layout(S.flow);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement("canvas");
      c.width = lay.width * 2;
      c.height = lay.height * 2;
      const ctx = c.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, lay.width, lay.height);
      const png = await new Promise((res) => c.toBlob(res, "image/png"));
      if (png) await saveFile(fileBase() + ".png", png);
    } catch (e) { toast("Không tạo được ảnh PNG."); } finally { URL.revokeObjectURL(url); }
  }
  const LEGEND = [
    ["ustart", "Người dùng thao tác (bấm, gõ, mở trang)"], ["start", "Điểm bắt đầu khác (request, sự kiện, lịch chạy)"], ["", "Một bước"], ["call", "Gọi hàm / dịch vụ khác"], ["stage", "Giai đoạn chính"],
    ["lane", "Rẽ nhánh: chỉ một nhánh chạy"], ["plane", "Song song: các nhánh chạy cùng lúc"], ["loop", "Lặp lại"], ["end", "Dừng tại đây (return / throw…)"],
    ["attn", "Đáng chú ý"], ["added", "Thay đổi: thêm mới"], ["modified", "Thay đổi: đã sửa"], ["removed", "Thay đổi: đã xoá"],
  ];
  function buildLegend() {
    $("legend").innerHTML = LEGEND.map(([k, t]) => `<div><i class="lg ${k}"></i>${t}</div>`).join("") + '<div class="muted">Bấm một ô để xem giải thích và đúng dòng code.</div>';
  }
  function toggleMenu(btn, menu, force) {
    const open = force != null ? force : menu.hidden;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  }
  function applyDiff() {
    const text = $("diff-input").value;
    if (!LL.diff.isUnifiedDiff(text)) { toast("Không thấy diff hợp lệ (cần các dòng @@ -a,b +c,d @@)."); return; }
    const after = S.ed.after.getValue();
    const before = S.ed.before.getValue();
    const fromAfter = !!after.trim();
    if (!fromAfter && !before.trim()) { toast("Dán code Trước hoặc Sau trước, rồi mới dán diff."); return; }
    // a diff of several files: use the file whose hunks fit the pasted code
    let best = null;
    for (const fd of LL.diff.parseUnified(text)) {
      const r = LL.diff.applyPatch(fromAfter ? after : before, fd, fromAfter ? "reverse" : "forward");
      if (!best || r.applied - r.failed > best.r.applied - best.r.failed) best = { fd, r };
    }
    if (!best || !best.r.applied) { setStatus(`Diff không khớp với code ${fromAfter ? "Sau" : "Trước"} đang có. Kiểm tra lại đúng file và đúng phiên bản.`, "err"); return; }
    const { fd, r } = best;
    (fromAfter ? S.ed.before : S.ed.after).setValue(r.code);
    showTab("after");
    refreshChange();
    updateCodeInfo();
    $("diff-dialog").hidden = true;
    const st = S.cmp ? S.cmp.stats : { added: 0, removed: 0 };
    const file = fd.newPath || fd.oldPath;
    if (!st.added && !st.removed) setStatus("Diff áp xong nhưng Trước và Sau giống hệt nhau. Kiểm tra lại diff.", "err");
    else setStatus(r.failed ? `Áp được ${r.applied}/${r.applied + r.failed} đoạn của diff${file ? " (" + file + ")" : ""}. Kiểm tra lại code Trước / Sau.` : `Đã dựng lại từ diff${file ? " của " + file : ""} (+${st.added} −${st.removed} dòng). Bấm “Vẽ sơ đồ thay đổi”.`, r.failed ? "err" : "");
    saveDraft();
  }

  // ───────────────────────── panes (phones) ─────────────────────────
  function showPane(pane) {
    document.querySelector(".app").dataset.pane = pane;
    document.querySelectorAll(".mobile-tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.pane === pane)));
    if (pane === "canvas") requestAnimationFrame(() => { if (S.flow) applyZoom(); });
  }
  LL.app.showPane = showPane;

  // ───────────────────────── boot ─────────────────────────
  function boot() {
    LAY.setMeasure(LAY.browserMeasure());
    let inputTimer = 0;
    createEditors(() => {
      $("example").value = "";
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => { refreshChange(); updateCodeInfo(); saveDraft(); if (S.selected) renderExplain(); }, 250);
    }, (line) => {
      if (!S.nodes.length) return;
      const hit = boxForLine(line);
      if (hit) select(hit.id, { fromCode: true });
    });

    const exSel = $("example");
    exSel.appendChild(new Option("Ví dụ…", ""));
    const groups = { code: "Ví dụ code", change: "Ví dụ thay đổi code (sửa bug)" };
    for (const [g, label] of Object.entries(groups)) {
      const og = document.createElement("optgroup");
      og.label = label;
      for (const ex of allExamples().filter((e) => e.group === g)) og.appendChild(new Option(ex.name, ex.id));
      if (og.children.length) exSel.appendChild(og);
    }
    exSel.addEventListener("change", () => { if (exSel.value) loadExample(exSel.value); });

    $("mode-seg").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.dataset.v === S.mode) return;
      // each mode keeps its own diagram: a code diagram never sits next to a change, or the other way round
      S.parked[S.mode] = S.flow ? { flow: S.flow, codeAtDraw: S.codeAtDraw } : null;
      setMode(b.dataset.v);
      const back = S.parked[S.mode];
      S.parked[S.mode] = null;
      S.codeAtDraw = back ? back.codeAtDraw : null;
      S.selected = null;
      S.tour = false;
      exSel.value = "";
      setFlow(back ? F.normalize(back.flow) : null);
      select(null);
      setStatus(back || S.mode === "code" ? "" : "Dán code Trước và Sau (hoặc một bên + git diff), rồi bấm “Vẽ sơ đồ thay đổi”.");
      saveDraft(true);
    });
    $("code-tabs").addEventListener("click", (e) => { const b = e.target.closest("[role=tab]"); if (b) showTab(b.dataset.tab); });
    document.querySelectorAll(".mobile-tabs button").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.pane)));
    for (const [id, key] of [["lang-seg", "lang"], ["detail-seg", "detail"]]) {
      const seg = $(id);
      seg.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        S[key] = b.dataset.v;
        seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === S[key])));
        saveDraft();
      });
    }

    $("draw").addEventListener("click", draw);
    $("stop").addEventListener("click", () => S.ctl && S.ctl.abort());
    $("copy-prompt").addEventListener("click", async () => {
      const p = promptNow();
      if (p.error) { toast(p.error); return; }
      const ok = await copyText(p.prompt);
      toast(ok ? "Đã copy prompt. Dán vào Claude, rồi dán câu trả lời vào ô bên dưới." : "Trình duyệt chặn copy.");
    });
    $("use-reply").addEventListener("click", () => {
      const r = F.parseReply($("reply").value);
      if (!r.flow) { setStatus(r.error, "err"); return; }
      refreshChange();
      $("alt").open = false;
      drawn(r.flow, `Đã vẽ từ câu trả lời: ${F.countBoxes(r.flow)} ô. Bấm vào ô để xem giải thích.`);
    });
    $("paste-diff").addEventListener("click", () => { $("diff-dialog").hidden = false; $("diff-input").focus(); });
    $("diff-cancel").addEventListener("click", () => { $("diff-dialog").hidden = true; });
    $("diff-apply").addEventListener("click", applyDiff);

    $("tour").addEventListener("click", toggleTour);
    $("prev").addEventListener("click", () => step(-1));
    $("next").addEventListener("click", () => step(1));
    $("card-prev").addEventListener("click", () => step(-1));
    $("card-next").addEventListener("click", () => step(1));
    $("card-close").addEventListener("click", () => { S.tour = false; select(null); });
    $("only-changes").addEventListener("change", () => setOnlyChanges($("only-changes").checked));
    // long summaries are clamped (2 lines, 1 on phones); a click shows the rest
    for (const id of ["d-summary", "change-bar"]) $(id).addEventListener("click", (e) => { const p = e.target.closest("p, .cs"); if (p) p.classList.toggle("open"); });
    $("zoom-in").addEventListener("click", () => zoomBy(1.2));
    $("zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
    $("zoom-fit").addEventListener("click", toggleFit);

    buildLegend();
    $("export-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleMenu($("export-btn"), $("export-menu")); toggleMenu($("legend-btn"), $("legend"), false); });
    $("legend-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleMenu($("legend-btn"), $("legend")); toggleMenu($("export-btn"), $("export-menu"), false); });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".menu-wrap")) { toggleMenu($("export-btn"), $("export-menu"), false); toggleMenu($("legend-btn"), $("legend"), false); }
    });
    $("copy-mermaid").addEventListener("click", async () => {
      if (!S.flow) return;
      const ok = await copyText(F.toMermaid(S.flow));
      toast(ok ? "Đã copy Mermaid. Dán vào GitHub, Notion hoặc Obsidian trong khối ```mermaid." : "Trình duyệt chặn copy.");
    });
    $("copy-dsl").addEventListener("click", async () => { if (S.flow) toast((await copyText(F.toText(S.flow))) ? "Đã copy sơ đồ dạng chữ." : "Trình duyệt chặn copy."); });
    $("export-menu").addEventListener("click", (e) => { if (e.target.closest("[role=menuitem]")) toggleMenu($("export-btn"), $("export-menu"), false); });
    $("dl-svg").addEventListener("click", () => { const s = svgForExport(); if (s) saveFile(fileBase() + ".svg", s); });
    $("dl-png").addEventListener("click", downloadPng);

    let dslTimer = 0;
    $("dsl").addEventListener("input", () => {
      clearTimeout(dslTimer);
      dslTimer = setTimeout(() => {
        const { flow, errors } = F.parseText($("dsl").value);
        $("example").value = "";
        const ul = $("dsl-errors");
        ul.textContent = "";
        for (const e of errors.slice(0, 8)) { const li = document.createElement("li"); li.textContent = (e.line ? "Dòng " + e.line + ": " : "") + e.message; ul.appendChild(li); }
        setFlow(flow, { fromText: true });
      }, 300);
    });

    // keyboard: ← → move between boxes, Esc closes the explanation
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("diff-dialog").hidden) { $("diff-dialog").hidden = true; $("paste-diff").focus(); return; }
      const t = e.target || {};
      const typing = /^(TEXTAREA|SELECT)$/.test(t.tagName || "") || (t.tagName === "INPUT" && t.type !== "checkbox");
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || (e.key === "ArrowDown" && S.tour)) { if (S.nodes.length) { e.preventDefault(); step(1); } }
      else if (e.key === "ArrowLeft" || (e.key === "ArrowUp" && S.tour)) { if (S.nodes.length) { e.preventDefault(); step(-1); } }
      else if (e.key === "Escape") { toggleMenu($("export-btn"), $("export-menu"), false); toggleMenu($("legend-btn"), $("legend"), false); if (S.selected || S.tour) { S.tour = false; select(null); } }
    });
    window.addEventListener("pagehide", flushDraft);

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
    if (draft && (draft.code || draft.after || (draft.flow && draft.flow.steps && draft.flow.steps.length))) {
      if (draft.lang === "en" || draft.lang === "vi") S.lang = draft.lang;
      if (["simple", "normal", "detailed"].includes(draft.detail)) S.detail = draft.detail;
      for (const [id, key] of [["lang-seg", "lang"], ["detail-seg", "detail"]]) $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === S[key])));
      const parked = draft.parked && typeof draft.parked === "object" ? draft.parked : {};
      if (draft.example && allExamples().some((x) => x.id === draft.example)) { exSel.value = draft.example; loadExample(draft.example); S.parked = parked; }
      else {
        S.ed.code.setValue(draft.code || "");
        S.ed.before.setValue(draft.before || "");
        S.ed.after.setValue(draft.after || "");
        setMode(draft.mode);
        S.codeAtDraw = draft.codeAtDraw != null ? draft.codeAtDraw : diagramCode();
        S.parked = parked;
        setFlow(draft.flow ? F.normalize(draft.flow) : null);
      }
    } else {
      exSel.value = LL.sample.EXAMPLES[0].id;
      loadExample(exSel.value);
    }
    showPane("canvas");

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { LAY.setMeasure(LAY.browserMeasure()); renderDiagram(); });
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        const w = $("canvas").clientWidth;
        if (S.flow && w > 0 && (w < 600) !== !!S.narrow) renderDiagram();
        else applyZoom();
      }).observe($("canvas"));
    }
    capability("sample").then((s) => { S.sample = s; });
    capability("downloads").then((d) => { S.downloads = d; $("dl-svg").hidden = !d; $("dl-png").hidden = !d; });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  LL.app._state = S;
})(globalThis.LL = globalThis.LL || {});
