/* Logic Lens — page state, drafts, small helpers, the code editors and the change (before / after) handling.
 * Used by app-diagram.js and app.js.
 */
(function (LL) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const F = LL.flow;
  const LAY = LL.layout;

  const S = {
    mode: "code", // "code" = one piece of code; "change" = before / after
    tab: "code", // code | before | after | text
    flow: null,
    nodes: [],
    byId: new Map(),
    selected: null,
    tour: false,
    onlyChanges: false,
    zoom: "auto",
    lang: "vi",
    detail: "normal",
    cmp: null, // diff of before → after (change mode)
    codeAtDraw: null, // the code the diagram's line numbers refer to
    parked: {}, // mode -> {flow, codeAtDraw}: the other mode's diagram, kept while that mode is not shown
    ctl: null,
    sample: undefined, // undefined = still checking, null = unavailable
    downloads: null,
    lay: null,
    narrow: false,
    ed: {},
  };

  // ───────────────────────── drafts (best effort) ─────────────────────────
  const KEY = "logic-lens:v2";
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  let saveTimer = 0;
  function writeDraft() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        mode: S.mode, code: S.ed.code.getValue(), before: S.ed.before.getValue(), after: S.ed.after.getValue(),
        flow: S.flow, codeAtDraw: S.codeAtDraw, parked: S.parked, lang: S.lang, detail: S.detail, example: $("example").value,
      }));
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
    toastTimer = setTimeout(() => (el.hidden = true), 2800);
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
  const linesLabel = (r) => (r[0] === r[1] ? "Dòng " + r[0] : "Dòng " + r[0] + "–" + r[1]);
  async function capability(name) {
    try { return window.claude && typeof window.claude.use === "function" ? await window.claude.use(name) : null; } catch (e) { return null; }
  }

  // ───────────────────────── editors ─────────────────────────
  function createEditors(onInput, onLineClick) {
    S.ed.code = LL.editor.create($("ed-code"), { label: "Code cần vẽ sơ đồ", placeholder: "Dán một hàm, component, API handler, stored procedure, script…\n(TypeScript, JavaScript, Python, Go, C#, Java, Kotlin, Rust, PHP, SQL, Bash…)", onInput, onLineClick });
    S.ed.before = LL.editor.create($("ed-before"), { label: "Code trước khi sửa", placeholder: "Dán code TRƯỚC khi sửa\n(hoặc bấm “Dán git diff” khi đã có code Sau)", onInput });
    S.ed.after = LL.editor.create($("ed-after"), { label: "Code sau khi sửa", placeholder: "Dán code SAU khi sửa\n(hoặc bấm “Dán git diff” khi đã có code Trước)", onInput, onLineClick });
  }

  /** The code the diagram is drawn from: the single code, or the "after" side of a change. */
  function diagramCode() {
    return (S.mode === "change" ? S.ed.after : S.ed.code).getValue();
  }
  function diagramEditor() {
    return S.mode === "change" ? S.ed.after : S.ed.code;
  }

  /** Recompute the before → after diff and show its marks in the "after" editor. */
  function refreshChange() {
    if (S.mode !== "change") { S.cmp = null; return null; }
    const b = S.ed.before.getValue();
    const a = S.ed.after.getValue();
    S.cmp = b.trim() && a.trim() ? LL.diff.compare(b, a) : null;
    S.ed.after.setMarks(S.cmp ? { added: S.cmp.added, delAt: S.cmp.delAt } : null);
    S.ed.before.setMarks(S.cmp ? { removed: new Set(S.cmp.listing.filter((l) => l.type === "del").map((l) => l.oldLine)) } : null);
    return S.cmp;
  }

  function updateCodeInfo() {
    const code = S.tab === "before" ? S.ed.before.getValue() : S.tab === "text" ? "" : diagramCode();
    const n = code ? code.split("\n").length : 0;
    let info = n ? `${n} dòng · ${F.guessLanguage(code)}` : "";
    if (S.mode === "change" && S.cmp && S.tab !== "text") info = `+${S.cmp.stats.added} −${S.cmp.stats.removed} dòng · ` + info;
    $("code-info").textContent = info;
    const lang = F.guessLanguage(diagramCode());
    for (const k of ["code", "before", "after"]) S.ed[k].setLanguage(k === "before" ? F.guessLanguage(S.ed.before.getValue()) : lang);
  }

  /** Show one tab of the code pane. */
  function showTab(tab) {
    if (S.mode === "code" && (tab === "before" || tab === "after")) tab = "code";
    if (S.mode === "change" && tab === "code") tab = "after";
    S.tab = tab;
    $("code-tabs").querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $("ed-code").hidden = tab !== "code";
    $("ed-before").hidden = tab !== "before";
    $("ed-after").hidden = tab !== "after";
    $("text-host").hidden = tab !== "text";
    updateCodeInfo();
  }

  /** Switch between explaining code and explaining a code change. */
  function setMode(mode) {
    S.mode = mode === "change" ? "change" : "code";
    $("mode-seg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === S.mode)));
    const change = S.mode === "change";
    $("code-tabs").querySelector('[data-tab="code"]').hidden = change;
    $("code-tabs").querySelector('[data-tab="before"]').hidden = !change;
    $("code-tabs").querySelector('[data-tab="after"]').hidden = !change;
    $("paste-diff").hidden = !change;
    $("only-changes-wrap").hidden = !change;
    $("draw").textContent = change ? "Vẽ sơ đồ thay đổi" : "Vẽ sơ đồ";
    refreshChange();
    showTab(change ? (S.tab === "before" ? "before" : "after") : S.tab === "text" ? "text" : "code");
  }

  LL.app = Object.assign(LL.app || {}, { S, $, F, LAY, toast, copyText, setStatus, linesLabel, capability, loadDraft, writeDraft, saveDraft, flushDraft, createEditors, diagramCode, diagramEditor, refreshChange, updateCodeInfo, showTab, setMode });
})(globalThis.LL = globalThis.LL || {});
