/* Logic Lens — asking Claude, exports, and wiring the page together (boot). */
(function (LL) {
  "use strict";

  const { S, $, F, LAY, toast, copyText, setStatus, linesLabel, capability, setCode, updateCodeInfo, buildCodeView, setCodeMode, highlightLines, loadDraft, writeDraft, saveDraft, flushDraft } = LL.app;
  const { setFlow, renderDiagram, MIN_FIT, applyZoom, zoomBy, applySelection, select, sheetMode, boxForLine, renderExplain, whereText, snippet, updateTourUi, step, toggleTour } = LL.app;

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
    capability_disabled: "Claude không dùng được trong cửa sổ này. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    not_declared: "Trang này không còn được phép gọi Claude. Có thể dùng Claude ở nơi khác (mục bên dưới).",
    bad_shape: "Claude trả về sơ đồ sai cấu trúc. Bấm vẽ lại, hoặc chọn mức “Gọn”.",
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
    const nLines = S.code.split("\n").length;
    setStatus(nLines > 400
      ? `Claude đang đọc ${nLines} dòng code… Code dài: sơ đồ sẽ chỉ giữ luồng chính. Muốn rõ hơn, hãy dán từng hàm. (thường mất 30–90 giây)`
      : "Claude đang đọc code và tìm các bước chính… (thường mất 20–60 giây)", "busy");
    const started = Date.now();
    try {
      const result = await S.sample.json(prompt, {
        signal: S.ctl.signal,
        modelTier: "default",
        onText: ({ text }) => {
          const titles = [...text.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).slice(1);
          setStatus(titles.length ? `Claude đã thấy ${titles.length} bước: ${titles.slice(-6).join(" · ")}…` : "Claude đang viết sơ đồ…", "busy");
        },
      });
      let flow;
      try { flow = F.normalize(result); } catch (err) { throw { code: "bad_shape" }; }
      if (!flow.steps.length) throw { code: "bad_shape" };
      buildCodeView();
      S.codeAtDraw = S.code;
      S.selected = null;
      S.tour = false;
      $("example").value = "";
      setFlow(flow);
      setCodeMode("view");
      const limit = { simple: 10, normal: 16, detailed: 26 }[S.detail] || 16;
      const dense = S.nodes.length > limit * 1.5;
      setStatus(`Xong sau ${Math.round((Date.now() - started) / 1000)} giây: ${S.nodes.length} ô. Bấm vào ô để xem giải thích.` + (dense ? " Sơ đồ khá dày: thử mức “Gọn” hoặc dán từng hàm để dễ đọc hơn." : ""));
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
    // clicking a code line selects the smallest box that covers it
    $("code-view").addEventListener("click", (e) => {
      const row = e.target.closest(".code-line");
      if (!row || (window.getSelection && String(window.getSelection()).length)) return;
      const line = S.lineEls.indexOf(row) + 1;
      const hit = line ? boxForLine(line) : null;
      if (hit) select(hit.id, { fromCode: true });
      else if (line && S.nodes.length) { select(null); toast("Dòng " + line + " không thuộc ô nào trên sơ đồ."); }
    });
    $("sheet-prev").addEventListener("click", () => step(-1));
    $("sheet-next").addEventListener("click", () => step(1));
    $("sheet-close").addEventListener("click", () => { S.tour = false; select(null); });
    // switch between the side-by-side and stacked branch layouts when the frame width crosses 600px
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        const w = $("canvas").clientWidth;
        if (S.flow && w > 0 && (w < 600) !== !!S.narrow) renderDiagram();
        else applyZoom();
      }).observe($("canvas"));
    }
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
      $("alt").open = false;
      setStatus(`Đã vẽ từ câu trả lời: ${S.nodes.length} ô. Bấm vào ô để xem giải thích.`);
    });

    $("tour").addEventListener("click", toggleTour);
    $("paste-own").addEventListener("click", () => {
      setCodeMode("edit");
      $("code").scrollIntoView({ block: "center", behavior: "smooth" });
      $("code").focus({ preventScroll: true });
      $("code").select();
      setStatus("Dán code của bạn vào khung (thay cho ví dụ), rồi bấm “Vẽ sơ đồ bằng Claude”.");
    });
    $("prev").addEventListener("click", () => step(-1));
    $("next").addEventListener("click", () => step(1));
    $("zoom-in").addEventListener("click", () => zoomBy(1.2));
    $("zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
    $("zoom-fit").addEventListener("click", () => {
      const svg = $("canvas").querySelector("svg");
      const shrunk = svg && S.lay && $("canvas").classList.contains("fit") && svg.getBoundingClientRect().width / S.lay.width < MIN_FIT;
      S.zoom = typeof S.zoom === "number" ? "auto" : S.zoom === "all" || shrunk ? "auto" : "all";
      applyZoom();
    });
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
        $("example").value = ""; // an edited example is the viewer's own diagram now
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
      if (e.target && e.target.closest && e.target.closest("#code-view") && /^Arrow/.test(e.key)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" && S.tour) { if (S.nodes.length) { e.preventDefault(); step(1); } }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" && S.tour) { if (S.nodes.length) { e.preventDefault(); step(-1); } }
      else if (e.key === "Escape" && (S.tour || S.selected)) { S.tour = false; select(null); }
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
      if (!s) $("draw").title = "Trang này không gọi trực tiếp được Claude: bấm để xem cách khác";
    });
    capability("downloads").then((d) => {
      S.downloads = d;
      $("dl-svg").hidden = !d;
      $("dl-png").hidden = !d;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  LL.app._state = S;
})(globalThis.LL = globalThis.LL || {});
