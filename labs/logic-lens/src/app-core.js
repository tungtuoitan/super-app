/* Logic Lens — page state, drafts, small helpers and the code panel. Used by app-diagram.js and app.js. */
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
    zoom: "auto", // "auto" = fit the frame but never below MIN_FIT; "all" = whole drawing; number = fixed scale
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
  function flushDraft() {
    if (saveTimer) writeDraft();
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

  LL.app = Object.assign(LL.app || {}, { S, $, F, LAY, toast, copyText, setStatus, linesLabel, capability, setCode, updateCodeInfo, buildCodeView, setCodeMode, highlightLines, loadDraft, writeDraft, saveDraft, flushDraft });
})(globalThis.LL = globalThis.LL || {});
