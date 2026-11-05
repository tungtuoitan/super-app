/* Agent Flight Deck — Load Sheet view: pack a codebase into a prompt under a token budget. */
(function (AFD) {
  "use strict";

  const { h, clear, esc, usd, tok, bytes, plural } = AFD.ui;
  const P = () => AFD.packer;

  const LANG_COLOR = {
    ts: "#3a6fd8", js: "#b98400", py: "#2f8f6f", go: "#16909f", rs: "#b5552b", java: "#a8452e", cs: "#6b4fc9", php: "#6466a8",
    swift: "#cc5f28", c: "#55687c", css: "#ad3f88", html: "#c4572c", data: "#6f7d8b", doc: "#8a6d3b", sh: "#4c7d38", sql: "#2b7a96",
    rb: "#b3334a", other: "#848e98",
  };
  const LANG_NAME = { ts: "TypeScript", js: "JavaScript", py: "Python", go: "Go", rs: "Rust", java: "JVM", cs: ".NET", php: "PHP", swift: "Swift", c: "C / C++", css: "Styles", html: "Markup", data: "Data / config", doc: "Docs", sh: "Shell", sql: "SQL", rb: "Ruby & co", other: "Other" };

  const BUDGETS = [
    { v: 1000000, label: "1M · Opus 5.5 / Sonnet 5.5 window" },
    { v: 200000, label: "200K" },
    { v: 100000, label: "100K" },
    { v: 32000, label: "32K" },
    { v: 8000, label: "8K" },
    { v: 4000, label: "4K" },
  ];
  const RESERVES = [0, 4000, 16000, 32000, 64000];
  const PRICE_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"];
  const MAX_TOTAL_READ = 60 * 1024 * 1024;

  const L = (AFD.ls = AFD.ls || {});

  const S = {
    raw: [],
    files: [],
    skipped: [],
    projectName: "",
    isExample: false,
    question: "",
    budget: 200000,
    reserve: 16000,
    format: "xml",
    opts: { stripComments: false, collapseBlank: true, trimTrailing: true, includeTree: true, useGitignore: true },
    filter: "",
    prompt: null,
    el: {},
  };

  function loadPrefs() {
    const pr = AFD.ui.pref("loadsheet", null);
    if (!pr) return;
    if (BUDGETS.some((b) => b.v === pr.budget)) S.budget = pr.budget;
    if (RESERVES.includes(pr.reserve)) S.reserve = pr.reserve;
    if (["xml", "markdown", "plain"].includes(pr.format)) S.format = pr.format;
    if (pr.opts && typeof pr.opts === "object") for (const k of Object.keys(S.opts)) if (typeof pr.opts[k] === "boolean") S.opts[k] = pr.opts[k];
  }
  function savePrefs() {
    // the example's tiny budget is a demo setting, never the viewer's preference
    const saved = AFD.ui.pref("loadsheet", {}) || {};
    const budget = S.exampleBudget ? saved.budget : S.budget;
    const reserve = S.exampleBudget ? saved.reserve : S.reserve;
    AFD.ui.setPref("loadsheet", { budget, reserve, format: S.format, opts: S.opts });
  }

  // ───────────────────────── mount ─────────────────────────

  function mount(root) {
    loadPrefs();
    const el = S.el;
    const dirInput = h("input", { type: "file", multiple: true, hidden: true, id: "ls-dir" });
    dirInput.setAttribute("webkitdirectory", "");
    const fileInput = h("input", { type: "file", multiple: true, hidden: true, id: "ls-file" });
    dirInput.addEventListener("change", () => { loadEntries(AFD.ui.filesFromInput(dirInput)); dirInput.value = ""; });
    fileInput.addEventListener("change", () => { loadEntries(AFD.ui.filesFromInput(fileInput)); fileInput.value = ""; });
    el.notice = h("div.notice", { hidden: true, role: "status" });
    el.progress = h("div.progress", { hidden: true }, h("i"));
    const bar = h("section.dropbar", { "aria-label": "Load a codebase" },
      h("div.dz-text", h("b", "Drop a project folder here"),
        h("small", "Files are read in this tab only. node_modules, build output, lockfiles, binaries and everything in .gitignore stay out.")),
      h("div.dz-actions",
        h("button.btn.primary", { type: "button", onclick: () => dirInput.click() }, AFD.ui.icon("folder"), "Open folder"),
        h("button.btn", { type: "button", onclick: () => fileInput.click() }, AFD.ui.icon("file"), "Open files"),
        h("button.btn.ghost", { type: "button", onclick: loadExample }, "Load example")),
      el.progress, el.notice, dirInput, fileInput);
    AFD.ui.dropzone(bar, loadEntries);

    // ── side: flight plan, weight & balance, packing
    el.question = h("textarea", { id: "ls-question", rows: 4, placeholder: "e.g. Why does checkout fail when the promo code is lowercase?" });
    let qTimer = 0;
    el.question.addEventListener("input", () => {
      S.question = el.question.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { rescore(); L.renderAll(); }, 250);
    });
    const autoBtn = h("button.btn.primary", { type: "button", onclick: autoLoad, style: { justifyContent: "center" } }, AFD.ui.icon("spark"), "Auto-load the relevant files");

    el.budget = h("select", { id: "ls-budget", "aria-label": "Token budget" }, BUDGETS.map((b) => h("option", { value: String(b.v) }, b.label)));
    el.budget.addEventListener("change", () => { S.budget = +el.budget.value; S.exampleBudget = false; savePrefs(); L.renderAll(); });
    el.reserve = h("select", { id: "ls-reserve", "aria-label": "Reserve for the response" }, RESERVES.map((r) => h("option", { value: String(r) }, r ? tok(r) + " for the reply" : "No reserve")));
    el.reserve.addEventListener("change", () => { S.reserve = +el.reserve.value; S.exampleBudget = false; savePrefs(); L.renderAll(); });
    el.wbStatus = h("div.wb-status");
    el.wbBig = h("div.wb-big");
    el.wbBar = h("div.wb-bar", { role: "img" });
    el.wbLegend = h("div.wb-legend");

    const checks = [
      ["stripComments", "Strip whole-line comments"],
      ["collapseBlank", "Collapse blank lines"],
      ["trimTrailing", "Trim trailing spaces"],
      ["includeTree", "Include a file tree"],
      ["useGitignore", "Respect .gitignore"],
    ].map(([k, label]) => {
      const box = h("input", { type: "checkbox", id: "ls-opt-" + k, checked: S.opts[k] });
      box.addEventListener("change", () => {
        S.opts[k] = box.checked;
        savePrefs();
        if (k === "useGitignore") reprepare();
        L.renderAll();
      });
      return h("label.check", { for: "ls-opt-" + k }, box, label);
    });
    el.formatSeg = h("div.seg", { role: "group", "aria-label": "Output format" }, [["xml", "XML"], ["markdown", "Markdown"], ["plain", "Plain"]].map(([v, label]) => {
      const b = h("button", { type: "button", "aria-pressed": String(S.format === v), onclick: () => {
        S.format = v;
        [...el.formatSeg.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        savePrefs();
        L.renderAll();
      } }, label);
      return b;
    }));

    const side = h("aside.ls-side",
      h("div.panel", h("div.panel-h", h("h2", "Flight plan")), h("div.panel-b.stack",
        h("label.field", { for: "ls-question" }, h("span", "What will you ask the model?"), el.question),
        autoBtn,
        h("div.howto", "Files are ranked by how often your question's words appear in their path and contents, then loaded best-first until the budget is full. Click any file to load or unload it."))),
      h("div.panel", h("div.panel-h", h("h2", "Weight & balance")), h("div.panel-b.stack",
        h("div.wb", h("div.row", { style: { justifyContent: "space-between", alignItems: "baseline" } }, el.wbBig, el.wbStatus), el.wbBar, el.wbLegend),
        h("div.row", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } },
          h("label.field", { for: "ls-budget" }, h("span", "Budget"), el.budget),
          h("label.field", { for: "ls-reserve" }, h("span", "Keep free"), el.reserve)))),
      h("div.panel", h("div.panel-h", h("h2", "Packing")), h("div.panel-b.stack", checks, h("div.row", h("span", { style: { fontSize: "12px", color: "var(--muted)" } }, "Format"), el.formatSeg))));

    // ── main: cargo map, manifest, prompt
    el.treemap = h("div.treemap", { role: "img", "aria-label": "Files sized by token count" });
    el.tmLegend = h("div.tl-legend", { style: { padding: "10px 0 0" } });
    el.tmTitle = h("span.hint");
    el.filter = h("input", { type: "search", id: "ls-filter", placeholder: "Filter files", "aria-label": "Filter files", style: { width: "200px" } });
    el.filter.addEventListener("input", () => { S.filter = el.filter.value.trim().toLowerCase(); L.renderManifest(); });
    el.manifest = h("div.files-tbl");
    el.manifestCount = h("span.hint");
    el.preview = h("pre.out-pre", { tabindex: "0", "aria-label": "Prompt preview" });
    el.promptStats = h("div.hint");
    el.costs = h("div.cost-row");
    el.copyBtn = h("button.btn.primary", { type: "button", onclick: copyPrompt }, AFD.ui.icon("copy"), "Copy prompt");
    el.skipped = h("details.skipped");
    el.projTitle = h("h2", "Cargo map");

    const main = h("div.ls-main",
      h("div.panel", h("div.panel-h", el.projTitle, el.tmTitle, h("span.spacer"), S.isExample ? null : null), h("div.panel-b", el.treemap, el.tmLegend)),
      h("div.panel", h("div.panel-h", h("h2", "Manifest"), el.manifestCount, h("span.spacer"), el.filter,
        h("button.btn.sm", { type: "button", onclick: () => setAll(true) }, "Load all shown"),
        h("button.btn.sm", { type: "button", onclick: () => setAll(false) }, "Unload all shown")), el.manifest),
      h("div.panel", h("div.panel-h", h("h2", "Prompt"), el.promptStats, h("span.spacer"), el.copyBtn), h("div.panel-b.stack", el.costs, el.preview, el.skipped)));

    root.appendChild(bar);
    root.appendChild(h("div.ls-grid", side, main));

    if (window.ResizeObserver) {
      let lastW = 0;
      new ResizeObserver(() => {
        const w = el.treemap.clientWidth;
        if (Math.abs(w - lastW) > 4) { lastW = w; L.renderTreemap(); }
      }).observe(el.treemap);
    }
    loadExample();
  }

  function setNotice(text, isErr) {
    S.el.notice.hidden = !text;
    S.el.notice.textContent = text || "";
    S.el.notice.classList.toggle("err", !!isErr);
  }

  function setProgress(v) {
    S.el.progress.hidden = v == null;
    if (v != null) S.el.progress.firstChild.style.width = Math.round(v * 100) + "%";
  }

  // ───────────────────────── loading ─────────────────────────

  function loadExample() {
    S.raw = Object.entries(AFD.sample.repo).map(([path, text]) => ({ path: AFD.sample.repoName + "/" + path, text, size: text.length }));
    S.isExample = true;
    S.projectName = AFD.sample.repoName;
    S.question = AFD.sample.repoQuestion;
    S.el.question.value = S.question;
    // a small budget so the example shows how files get picked
    S.budget = 4000;
    S.reserve = 0;
    S.exampleBudget = true;
    reprepare();
    autoLoad(true);
    setNotice("");
  }

  async function loadEntries(entries) {
    const real = entries.filter((e) => e.file || e.skippedDir);
    if (!real.length) { setNotice("Nothing to load.", true); return; }
    // drop the example's small budget: back to defaults, then the viewer's saved choices
    if (S.exampleBudget) {
      S.budget = 200000;
      S.reserve = 16000;
      S.exampleBudget = false;
      loadPrefs();
    }
    // pass 1: read only the .gitignore files, so ignored files are never read
    const plan = real.filter((e) => e.file).map((e) => ({ path: e.path, size: e.file.size, file: e.file, text: undefined }));
    for (const r of plan) if (/(^|\/)\.gitignore$/.test(r.path)) r.text = await AFD.ui.readText(r.file).catch(() => undefined);
    const first = P().prepare(plan, { useGitignore: S.opts.useGitignore });
    const want = new Set(first.skipped.filter((x) => x.reason === "unreadable").map((x) => x.path));
    const prefix = first.root ? first.root + "/" : "";
    const toRead = plan.filter((r) => r.text === undefined && want.has(r.path.replace(/^\.?\/+/, "").slice(prefix.length)));
    const total = toRead.reduce((a, r) => a + r.size, 0) || 1;
    setNotice(`Reading ${plural(toRead.length, "file")} (${bytes(total)})…`);
    setProgress(0);
    let done = 0;
    let budgetLeft = MAX_TOTAL_READ;
    for (let i = 0; i < toRead.length; i++) {
      const r = toRead[i];
      if (r.size <= budgetLeft) {
        r.text = await AFD.ui.readText(r.file).catch(() => undefined);
        budgetLeft -= r.size;
      }
      done += r.size;
      if (i % 25 === 0) { setProgress(done / total); await new Promise((res) => setTimeout(res, 0)); }
    }
    setProgress(null);
    S.raw = plan.map((r) => ({ path: r.path, size: r.size, text: r.text }));
    S.skippedDirs = real.filter((e) => e.skippedDir).map((e) => ({ path: e.path.replace(/\/$/, ""), reason: "folder skipped", size: 0 }));
    S.isExample = false;
    S.question = S.el.question.value = "";
    reprepare();
    // a dropped folder names the project; loose files picked one by one do not
    S.projectName = (S.prep && S.prep.root) || (S.raw.some((r) => r.path.includes("/")) ? S.raw.find((r) => r.path.includes("/")).path.split("/")[0] : "selected files");
    // default selection: everything that fits, smallest-first is unhelpful, so load all and let the user trim
    for (const f of S.files) f.include = !f.secretHint;
    const flagged = S.files.filter((f) => f.secretHint).length;
    // warm the relevance index while the user reads the result, so the first question is instant
    const warm = (dl) => { if (!P().warmTerms(S.files, dl) && window.requestIdleCallback) requestIdleCallback(warm); };
    if (window.requestIdleCallback) requestIdleCallback(warm); else setTimeout(() => P().warmTerms(S.files), 200);
    const totalTok = S.files.reduce((a, f) => a + f.tokens, 0);
    const msg = [`Loaded ${plural(S.files.length, "file")} (${tok(totalTok)} tokens).`];
    if (S.skipped.length) msg.push(`${S.skipped.length} skipped.`);
    if (flagged) msg.push(`${plural(flagged, "file looks", "files look")} like ${flagged === 1 ? "it contains" : "they contain"} a key or token and ${flagged === 1 ? "was" : "were"} not loaded (marked ⚠ in the manifest).`);
    if (budgetLeft <= 0) msg.push(`Stopped reading after ${bytes(MAX_TOTAL_READ)}.`);
    if (totalTok > S.budget - S.reserve) msg.push("That is over budget: type a question and press Auto-load, or unload files.");
    setNotice(msg.join(" "));
    L.renderAll();
  }

  function reprepare() {
    const prev = new Map(S.files.map((f) => [f.path, f.include]));
    S.prep = P().prepare(S.raw, { useGitignore: S.opts.useGitignore });
    S.files = S.prep.files;
    S.skipped = S.prep.skipped.concat(S.skippedDirs || []);
    for (const f of S.files) if (prev.has(f.path)) f.include = prev.get(f.path);
    rescore();
  }

  function rescore() {
    S.terms = P().scoreFiles(S.files, S.question);
  }

  function capacity() {
    return Math.max(0, S.budget - S.reserve);
  }

  /** Pick files by relevance until the prompt (with wrappers, tree and question) fits. */
  function autoLoad(silent) {
    rescore();
    const cap = capacity();
    const hasTerms = S.terms && S.terms.length;
    if (!hasTerms) {
      // no question: keep it simple, fill by size so the most files fit
      const ranked = S.files.slice().sort((a, b) => P().packedTokens(a, S.opts) - P().packedTokens(b, S.opts));
      let used = 0;
      for (const f of ranked) {
        const c = P().packedTokens(f, S.opts);
        f.include = used + c <= cap * 0.95;
        if (f.include) used += c;
      }
    } else {
      P().autoSelect(S.files, cap * 0.95, S.opts);
    }
    // the tree and question also take room: drop the lowest-ranked files by the measured overshoot, rebuilding a few times at most
    let prompt = build();
    const byScore = S.files.filter((f) => f.include).sort((a, b) => a.score - b.score || b.tokens - a.tokens);
    for (let round = 0; prompt.tokens > cap && byScore.length && round < 8; round++) {
      let over = prompt.tokens - cap;
      while (over > 0 && byScore.length) {
        const f = byScore.shift();
        f.include = false;
        over -= P().docTokens(f, S.opts) + Math.ceil(f.path.length / 6); // its document plus its line in the tree
      }
      prompt = build();
    }
    L.renderAll();
    if (silent !== true) AFD.ui.toast(`Loaded ${plural(S.files.filter((f) => f.include).length, "file")} · ${tok(prompt.tokens)} tokens`);
  }

  function build() {
    return P().buildPrompt(S.files, { format: S.format, includeTree: S.opts.includeTree, question: S.question, projectName: S.projectName, transform: S.opts });
  }

  function setAll(on) {
    for (const f of shownFiles()) f.include = on;
    L.renderAll();
  }

  function shownFiles() {
    const q = S.filter;
    return q ? S.files.filter((f) => f.path.toLowerCase().includes(q)) : S.files;
  }

  async function copyPrompt() {
    const p = S.prompt || build();
    if (!p.files) { AFD.ui.toast("No files loaded yet"); return; }
    const ok = await AFD.ui.copyText(p.text);
    AFD.ui.toast(ok ? `Copied ${tok(p.tokens)} tokens (${plural(p.files, "file")})` : "Copy was blocked by the browser. Select the preview and copy it by hand.");
  }

  function onShow() {
    L.renderTreemap();
  }

  Object.assign(L, { S, LANG_COLOR, LANG_NAME, PRICE_MODELS, autoLoad, build, capacity, copyPrompt, loadEntries, loadExample, loadPrefs, mount, onShow, reprepare, rescore, savePrefs, setAll, setNotice, setProgress, shownFiles });
  AFD.loadsheet = { mount, onShow, loadEntries, _state: S };
})(globalThis.AFD = globalThis.AFD || {});
