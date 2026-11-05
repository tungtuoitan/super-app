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
  const TREEMAP_MAX_CELLS = 1200;

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
      qTimer = setTimeout(() => { rescore(); renderAll(); }, 250);
    });
    const autoBtn = h("button.btn.primary", { type: "button", onclick: autoLoad, style: { justifyContent: "center" } }, AFD.ui.icon("spark"), "Auto-load the relevant files");

    el.budget = h("select", { id: "ls-budget", "aria-label": "Token budget" }, BUDGETS.map((b) => h("option", { value: String(b.v) }, b.label)));
    el.budget.addEventListener("change", () => { S.budget = +el.budget.value; S.exampleBudget = false; savePrefs(); renderAll(); });
    el.reserve = h("select", { id: "ls-reserve", "aria-label": "Reserve for the response" }, RESERVES.map((r) => h("option", { value: String(r) }, r ? tok(r) + " for the reply" : "No reserve")));
    el.reserve.addEventListener("change", () => { S.reserve = +el.reserve.value; S.exampleBudget = false; savePrefs(); renderAll(); });
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
        renderAll();
      });
      return h("label.check", { for: "ls-opt-" + k }, box, label);
    });
    el.formatSeg = h("div.seg", { role: "group", "aria-label": "Output format" }, [["xml", "XML"], ["markdown", "Markdown"], ["plain", "Plain"]].map(([v, label]) => {
      const b = h("button", { type: "button", "aria-pressed": String(S.format === v), onclick: () => {
        S.format = v;
        [...el.formatSeg.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        savePrefs();
        renderAll();
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
    el.filter.addEventListener("input", () => { S.filter = el.filter.value.trim().toLowerCase(); renderManifest(); });
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
        if (Math.abs(w - lastW) > 4) { lastW = w; renderTreemap(); }
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
    S.projectName = (S.prep && S.prep.root) || (S.raw[0] ? S.raw[0].path.split("/")[0] : "project");
    // default selection: everything that fits, smallest-first is unhelpful, so load all and let the user trim
    for (const f of S.files) f.include = true;
    const totalTok = S.files.reduce((a, f) => a + f.tokens, 0);
    const msg = [`Loaded ${plural(S.files.length, "file")} (${tok(totalTok)} tokens).`];
    if (S.skipped.length) msg.push(`${S.skipped.length} skipped.`);
    if (budgetLeft <= 0) msg.push(`Stopped reading after ${bytes(MAX_TOTAL_READ)}.`);
    if (totalTok > S.budget - S.reserve) msg.push("That is over budget: type a question and press Auto-load, or unload files.");
    setNotice(msg.join(" "));
    renderAll();
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
    // trim the lowest-ranked files until the full prompt fits
    let prompt = build();
    const byScore = S.files.filter((f) => f.include).sort((a, b) => a.score - b.score || b.tokens - a.tokens);
    while (prompt.tokens > cap && byScore.length) {
      byScore.shift().include = false;
      prompt = build();
    }
    renderAll();
    if (silent !== true) AFD.ui.toast(`Loaded ${plural(S.files.filter((f) => f.include).length, "file")} · ${tok(prompt.tokens)} tokens`);
  }

  function build() {
    return P().buildPrompt(S.files, { format: S.format, includeTree: S.opts.includeTree, question: S.question, projectName: S.projectName, transform: S.opts });
  }

  function setAll(on) {
    for (const f of shownFiles()) f.include = on;
    renderAll();
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

  // ───────────────────────── rendering ─────────────────────────

  function renderAll() {
    const el = S.el;
    if (!el.budget) return;
    el.budget.value = String(S.budget);
    if (!el.budget.value) {
      el.budget.appendChild(h("option", { value: String(S.budget) }, tok(S.budget)));
      el.budget.value = String(S.budget);
    }
    el.reserve.value = String(S.reserve);
    for (const k of Object.keys(S.opts)) {
      const box = document.getElementById("ls-opt-" + k);
      if (box) box.checked = S.opts[k];
    }
    [...el.formatSeg.children].forEach((c, i) => c.setAttribute("aria-pressed", String(["xml", "markdown", "plain"][i] === S.format)));
    S.prompt = build();
    el.projTitle.textContent = S.projectName ? S.projectName : "Cargo map";
    renderWB();
    renderTreemap();
    renderManifest();
    renderPrompt();
  }

  function renderWB() {
    const el = S.el;
    const used = S.prompt.tokens;
    const cap = capacity();
    const over = used > cap;
    const scale = Math.max(S.budget, used);
    el.wbBig.innerHTML = `${esc(tok(used))} <span style="font-size:14px;color:var(--muted);font-weight:500">/ ${esc(tok(cap))}</span>`;
    el.wbStatus.textContent = over ? `Over by ${tok(used - cap)}` : `${tok(cap - used)} free`;
    el.wbStatus.className = "wb-status " + (over ? "over" : "ok");
    el.wbBar.innerHTML = "";
    el.wbBar.appendChild(h("div.payload", { style: { width: Math.min(100, (used / scale) * 100) + "%", background: over ? "var(--bad)" : "var(--ink)" } }));
    if (S.reserve) el.wbBar.appendChild(h("div.reserve", { style: { left: (cap / scale) * 100 + "%", width: (S.reserve / scale) * 100 + "%" } }));
    el.wbBar.setAttribute("aria-label", `Prompt uses ${tok(used)} of ${tok(cap)} tokens`);
    const totalAll = S.files.reduce((a, f) => a + P().packedTokens(f, S.opts), 0);
    el.wbLegend.innerHTML = `<span><i class="swatch" style="background:var(--ink)"></i> Prompt ${esc(plural(S.prompt.files, "file"))}</span>` +
      (S.reserve ? `<span><i class="swatch" style="background:var(--warn)"></i> Reply ${esc(tok(S.reserve))}</span>` : "") +
      `<span>Whole project ${esc(tok(totalAll))}</span>`;
  }

  function renderTreemap() {
    const el = S.el;
    const box = el.treemap;
    if (!box.isConnected) return;
    clear(box);
    const W = box.clientWidth || 600;
    const H = box.clientHeight || 340;
    let items = S.files.map((f) => ({ value: Math.max(1, P().packedTokens(f, S.opts)), f }));
    items.sort((a, b) => b.value - a.value);
    let rest = null;
    if (items.length > TREEMAP_MAX_CELLS) {
      const tail = items.slice(TREEMAP_MAX_CELLS);
      items = items.slice(0, TREEMAP_MAX_CELLS);
      rest = { value: tail.reduce((a, x) => a + x.value, 0), rest: tail.length };
      items.push(rest);
    }
    const rects = P().squarify(items, 0, 0, W, H);
    const langs = new Map();
    for (const r of rects) {
      const f = r.item.f;
      if (!f) {
        box.appendChild(h("div.tm-cell", { style: { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", background: "var(--c-other)", cursor: "default" } }, h("span", `${r.item.rest} smaller files`)));
        continue;
      }
      langs.set(f.lang, (langs.get(f.lang) || 0) + r.item.value);
      const cell = h("div.tm-cell" + (f.include ? "" : ".off"), {
        style: { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", background: LANG_COLOR[f.lang] || LANG_COLOR.other },
        role: "button", tabindex: r.w > 30 && r.h > 18 ? "0" : "-1", "aria-pressed": String(f.include), "aria-label": `${f.path}, ${tok(r.item.value)} tokens`,
      });
      if (r.w > 46 && r.h > 16) cell.appendChild(h("span", f.path.split("/").pop()));
      if (r.w > 46 && r.h > 30) cell.appendChild(h("small", tok(r.item.value)));
      const toggle = () => { f.include = !f.include; renderAll(); };
      cell.addEventListener("click", toggle);
      cell.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      cell.addEventListener("pointermove", (e) => AFD.ui.tip(e, `<b>${esc(f.path)}</b>\n${esc(tok(r.item.value))} tokens · ${esc(String(f.lines))} lines${f.score > 0 ? `\nrelevance ${f.score.toFixed(2)}` : ""}\n${f.include ? "Loaded · click to unload" : "Not loaded · click to load"}`));
      cell.addEventListener("pointerleave", AFD.ui.hideTip);
      box.appendChild(cell);
    }
    if (!S.files.length) box.appendChild(h("div", { style: { padding: "20px", color: "var(--muted)" } }, "No readable text files."));
    const totalAll = S.files.reduce((a, f) => a + P().packedTokens(f, S.opts), 0);
    el.tmTitle.textContent = `${plural(S.files.length, "file")} · ${tok(totalAll)} tokens${S.isExample ? " · example project" : ""}`;
    el.tmLegend.innerHTML = [...langs.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => `<span><i class="swatch" style="background:${LANG_COLOR[l] || LANG_COLOR.other}"></i>${esc(LANG_NAME[l] || l)} ${esc(tok(v))}</span>`).join("") +
      `<span><i class="swatch" style="background:var(--line);background-image:repeating-linear-gradient(-45deg,transparent,transparent 2px,var(--faint) 2px,var(--faint) 3px)"></i>Not loaded</span>`;
  }

  function renderManifest() {
    const el = S.el;
    clear(el.manifest);
    const rows = shownFiles();
    const loaded = S.files.filter((f) => f.include).length;
    el.manifestCount.textContent = `${loaded} of ${S.files.length} loaded`;
    const maxScore = Math.max(...S.files.map((f) => f.score), 0);
    const hasScore = maxScore > 0;
    const cols = [
      { key: "include", label: "", sortable: false, render: (r) => {
        const box = h("input", { type: "checkbox", checked: r.include, "aria-label": "Load " + r.path });
        box.addEventListener("click", (e) => e.stopPropagation());
        box.addEventListener("change", () => { r.include = box.checked; renderAll(); });
        return box;
      } },
      { key: "path", label: "File", render: (r) => h("div.path", { title: r.path }, h("bdi", r.path)), ascFirst: true },
      { key: "lang", label: "Type", render: (r) => h("span", { style: { display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" } }, h("i.swatch", { style: { background: LANG_COLOR[r.lang] || LANG_COLOR.other } }), LANG_NAME[r.lang] || r.lang) },
      { key: "tokens", label: "≈Tokens", num: true, render: (r) => tok(P().packedTokens(r, S.opts)), sort: (r) => P().packedTokens(r, S.opts) },
    ];
    if (hasScore) cols.push({ key: "score", label: "Relevance", render: (r) => h("span", { title: r.score.toFixed(2) }, h("i.score", { style: { width: Math.max(2, (r.score / maxScore) * 70) + "px", opacity: r.score > 0 ? 1 : 0.2 } })) });
    el.manifest.appendChild(AFD.ui.table(cols, rows, { sortKey: hasScore ? "score" : "tokens", onRow: (r) => { r.include = !r.include; renderAll(); }, limit: 3000 }));
  }

  function renderPrompt() {
    const el = S.el;
    const p = S.prompt;
    const text = p.text;
    el.promptStats.textContent = `${plural(p.files, "file")} · ≈${tok(p.tokens)} tokens · ${text.length.toLocaleString("en-US")} chars`;
    const HEAD = 6000;
    const TAIL = 1500;
    el.preview.textContent = p.files
      ? text.length > HEAD + TAIL + 200
        ? text.slice(0, HEAD) + `\n\n  ⋯ ${(text.length - HEAD - TAIL).toLocaleString("en-US")} characters not shown here; Copy prompt copies everything ⋯\n\n` + text.slice(-TAIL)
        : text
      : "Load some files to build the prompt.";
    el.copyBtn.disabled = !p.files;

    clear(el.costs);
    el.costs.appendChild(h("span.h", "Input cost of this prompt"));
    el.costs.appendChild(h("span.h.num", "First send"));
    el.costs.appendChild(h("span.h.num", { title: "Each later request that reuses the same prompt prefix from the prompt cache" }, "Cached re-send"));
    for (const m of PRICE_MODELS) {
      const c = AFD.pricing.promptCost(p.tokens, m);
      if (!c) continue;
      el.costs.appendChild(h("span", AFD.pricing.displayName(m)));
      el.costs.appendChild(h("span.num", usd(c.first)));
      el.costs.appendChild(h("span.num", usd(c.reread)));
    }

    clear(el.skipped);
    if (S.skipped.length) {
      const groups = new Map();
      for (const s of S.skipped) {
        if (!groups.has(s.reason)) groups.set(s.reason, []);
        groups.get(s.reason).push(s);
      }
      el.skipped.appendChild(h("summary", `${plural(S.skipped.length, "file")} left out: ` + [...groups.entries()].map(([r, list]) => `${list.length} ${r}`).join(", ")));
      el.skipped.appendChild(h("ul", S.skipped.slice(0, 400).map((s) => h("li", `${s.path}  (${s.reason})`))));
    }
  }

  function onShow() {
    renderTreemap();
  }

  AFD.loadsheet = { mount, onShow, loadEntries, _state: S };
})(globalThis.AFD = globalThis.AFD || {});
