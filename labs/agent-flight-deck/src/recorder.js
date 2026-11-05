/* Agent Flight Deck — Flight Recorder: loading logs, the all-sessions view, keyboard. Other parts: recorder-*.js (shared through AFD.rec). */
(function (AFD) {
  "use strict";

  const R = (AFD.rec = AFD.rec || {});

  const { h, clear, esc, usd, tok, pct, dur, clock, dateTime, date, plural, catColor, CAT_LABEL } = AFD.ui;
  const IDLE_MS = 5 * 60 * 1000;
  const GAP_CAP_MS = 60 * 1000; // gaps longer than this are drawn as if they were 60s

  const KIND_LABEL = { prompt: "You", command: "Command", text: "Claude", thinking: "Thinking", tool: "Tool", compact: "Compacted", error: "Error", interrupt: "Interrupted", subprompt: "Subagent task" };
  const FILTERS = [
    { key: "prompt", label: "Prompts", kinds: ["prompt", "command", "interrupt", "subprompt"] },
    { key: "text", label: "Replies", kinds: ["text"] },
    { key: "thinking", label: "Thinking", kinds: ["thinking"] },
    { key: "tool", label: "Tools", kinds: ["tool"] },
    { key: "error", label: "Errors & compaction", kinds: ["error", "compact"] },
  ];

  const S = {
    root: null,
    content: null,
    notice: null,
    progress: null,
    sessions: [],
    session: null,
    isExample: false,
    cursor: -1,
    selected: -1,
    playing: false,
    timer: 0,
    speed: 4,
    filters: new Set(FILTERS.map((f) => f.key)),
    query: "",
    view: null, // refs into the rendered session view
  };

  Object.assign(R, { S, KIND_LABEL, FILTERS, IDLE_MS, GAP_CAP_MS });

  // ───────────────────────── mount & loading ─────────────────────────

  function mount(root) {
    S.root = root;
    const fileInput = h("input", { type: "file", multiple: true, accept: ".jsonl,.json,.txt", hidden: true, id: "rec-file" });
    const dirInput = h("input", { type: "file", multiple: true, hidden: true, id: "rec-dir" });
    dirInput.setAttribute("webkitdirectory", "");
    fileInput.addEventListener("change", () => { loadEntries(AFD.ui.filesFromInput(fileInput)); fileInput.value = ""; });
    dirInput.addEventListener("change", () => { loadEntries(AFD.ui.filesFromInput(dirInput)); dirInput.value = ""; });

    S.notice = h("div.notice", { hidden: true, role: "status" });
    S.progress = h("div.progress", { hidden: true }, h("i"));
    const bar = h("section.dropbar", { "aria-label": "Load session logs" },
      h("div.dz-text",
        h("b", "Drop Claude Code session logs here"),
        h("small", { html: "One <code>.jsonl</code> file, several, or the whole <code>~/.claude/projects</code> folder (Windows: <code>%USERPROFILE%\\.claude\\projects</code>). On macOS press <kbd>⌘ Shift .</kbd> in the file picker to show hidden folders." })),
      h("div.dz-actions",
        h("button.btn.primary", { type: "button", onclick: () => fileInput.click() }, AFD.ui.icon("file"), "Open .jsonl"),
        h("button.btn", { type: "button", onclick: () => dirInput.click() }, AFD.ui.icon("folder"), "Open folder"),
        h("button.btn.ghost", { type: "button", onclick: loadExample }, "Load example")),
      S.progress, S.notice, fileInput, dirInput);
    AFD.ui.dropzone(bar, loadEntries);
    S.content = h("div");
    document.addEventListener("keydown", onKey);
    root.appendChild(bar);
    root.appendChild(S.content);
    loadExample();
  }

  function setNotice(text, isErr) {
    S.notice.hidden = !text;
    S.notice.textContent = text || "";
    S.notice.classList.toggle("err", !!isErr);
  }

  function setProgress(v) {
    S.progress.hidden = v == null;
    if (v != null) S.progress.firstChild.style.width = Math.round(v * 100) + "%";
  }

  function loadExample() {
    const text = AFD.sample.sessionJsonl();
    const res = AFD.session.analyzeFiles([{ name: AFD.sample.sessionFileName, text }]);
    S.sessions = res.sessions;
    S.isExample = true;
    setNotice("");
    R.openSession(res.sessions[0]);
  }

  async function loadEntries(entries) {
    let logs = entries.filter((e) => e.file && /\.jsonl$/i.test(e.path));
    // a whole ~/.claude/projects folder can hold gigabytes: read the newest logs first, up to a cap
    const CAP = 400 * 1024 * 1024;
    let skippedForCap = 0;
    if (logs.reduce((a, e) => a + (e.file.size || 0), 0) > CAP) {
      logs = logs.slice().sort((a, b) => (b.file.lastModified || 0) - (a.file.lastModified || 0));
      let used = 0;
      logs = logs.filter((e) => { used += e.file.size || 0; if (used > CAP) { skippedForCap++; return false; } return true; });
    }
    if (!logs.length) {
      setNotice(entries.length ? "No .jsonl files found. Claude Code keeps session logs in ~/.claude/projects/<project>/<session>.jsonl." : "Nothing to load.", true);
      return;
    }
    R.stop();
    const total = logs.reduce((a, e) => a + (e.file.size || 0), 0) || 1;
    let done = 0;
    const texts = [];
    setNotice(`Reading ${plural(logs.length, "file")} (${AFD.ui.bytes(total)})…`);
    setProgress(0);
    for (const e of logs) {
      try {
        texts.push({ name: e.path, text: await AFD.ui.readText(e.file) });
      } catch (err) {
        /* unreadable file: skip it */
      }
      done += e.file.size || 0;
      setProgress(done / total);
      if (texts.length % 20 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    setNotice("Analyzing…");
    await new Promise((r) => setTimeout(r, 0));
    let res;
    try {
      res = AFD.session.analyzeFiles(texts);
    } catch (err) {
      setProgress(null);
      setNotice("Could not read these files: " + (err && err.message ? err.message : err), true);
      return;
    }
    setProgress(null);
    if (!res.sessions.length) {
      setNotice("These files have no Claude Code messages in them.", true);
      return;
    }
    S.sessions = res.sessions;
    S.isExample = false;
    const notes = [`Loaded ${plural(res.sessions.length, "session")} from ${plural(texts.length, "file")}.`];
    if (res.bad) notes.push(`${plural(res.bad, "line")} could not be parsed and were skipped.`);
    if (skippedForCap) notes.push(`${plural(skippedForCap, "older log")} left out to stay under ${AFD.ui.bytes(CAP)}; open a project folder to see them.`);
    setNotice(notes.join(" "));
    if (res.sessions.length === 1) R.openSession(res.sessions[0]);
    else showFleet();
  }

  // ───────────────────────── fleet (many sessions) ─────────────────────────

  function showFleet() {
    R.stop();
    S.session = null;
    S.view = null;
    clear(S.content);
    const ss = S.sessions;
    const total = ss.reduce((a, s) => a + s.totals.cost, 0);
    const calls = ss.reduce((a, s) => a + s.totals.apiCalls, 0);
    const active = ss.reduce((a, s) => a + s.activeMs, 0);
    const tools = ss.reduce((a, s) => a + s.tools.length, 0);
    const unpriced = ss.reduce((a, s) => a + s.totals.unpricedCalls, 0);

    // spend by day
    const byDay = new Map();
    for (const s of ss) {
      if (!s.startT) continue;
      const d = new Date(s.startT);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      byDay.set(key, (byDay.get(key) || 0) + s.totals.cost);
    }
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const byProject = new Map();
    for (const s of ss) {
      const k = s.project || "(unknown)";
      if (!byProject.has(k)) byProject.set(k, { project: k, sessions: 0, cost: 0, active: 0, calls: 0 });
      const p = byProject.get(k);
      p.sessions++;
      p.cost += s.totals.cost;
      p.active += s.activeMs;
      p.calls += s.totals.apiCalls;
    }
    const projects = [...byProject.values()];
    const maxP = Math.max(...projects.map((p) => p.cost), 1e-9);
    const maxS = Math.max(...ss.map((s) => s.totals.cost), 1e-9);

    S.content.appendChild(h("section.fleet",
      h("div.panel", h("div.panel-h", h("h2", "All sessions"), h("span.hint", "Estimated at API list prices")),
        h("div.panel-b.fleet-kpis",
          kpi("Sessions", String(ss.length)),
          kpi("Est. spend", usd(total)),
          kpi("API calls", calls.toLocaleString("en-US")),
          kpi("Tool calls", tools.toLocaleString("en-US")),
          kpi("Active time", dur(active)),
          unpriced ? kpi("Unpriced calls", String(unpriced)) : null)),
      days.length > 1 ? h("div.panel", h("div.panel-h", h("h3", "Spend by day")), h("div.panel-b", dayChart(days))) : null,
      h("div.charts",
        h("div.panel", h("div.panel-h", h("h3", "Projects")), AFD.ui.table([
          { key: "project", label: "Project", render: (r) => h("span.mono", r.project) },
          { key: "sessions", label: "Sessions", num: true },
          { key: "active", label: "Active", num: true, render: (r) => dur(r.active) },
          { key: "cost", label: "Est. cost", num: true, render: (r) => usd(r.cost) },
          { key: "share", label: "", sortable: false, render: (r) => h("div.minibar", h("i", { style: { width: (r.cost / maxP) * 100 + "%", background: "var(--accent)" } })) },
        ], projects, { sortKey: "cost" })),
        h("div.panel", h("div.panel-h", h("h3", "Most expensive sessions")), AFD.ui.table([
          { key: "title", label: "Session", render: (r) => h("div.ttl", { title: r.title }, r.title) },
          { key: "cost", label: "Est. cost", num: true, render: (r) => usd(r.totals.cost), sort: (r) => r.totals.cost },
        ], ss.slice().sort((a, b) => b.totals.cost - a.totals.cost).slice(0, 8), { sortKey: "cost", onRow: (r) => R.openSession(r) }))),
      h("div.panel", h("div.panel-h", h("h3", "Sessions"), h("span.hint", "Click a row to replay it")), AFD.ui.table([
        { key: "startT", label: "Started", render: (r) => h("span.tnum", dateTime(r.startT)) },
        { key: "project", label: "Project", render: (r) => h("span.mono", r.project || "—") },
        { key: "title", label: "First prompt", render: (r) => h("div.ttl", { title: r.title }, r.title) },
        { key: "promptCount", label: "Prompts", num: true },
        { key: "calls", label: "Calls", num: true, render: (r) => String(r.totals.apiCalls), sort: (r) => r.totals.apiCalls },
        { key: "activeMs", label: "Active", num: true, render: (r) => dur(r.activeMs) },
        { key: "hit", label: "Cache hit", num: true, render: (r) => pct(r.totals.cacheHit), sort: (r) => r.totals.cacheHit },
        { key: "cost", label: "Est. cost", num: true, render: (r) => usd(r.totals.cost), sort: (r) => r.totals.cost },
        { key: "bar", label: "", sortable: false, render: (r) => h("div.minibar", h("i", { style: { width: (r.totals.cost / maxS) * 100 + "%", background: "var(--accent)" } })) },
      ], ss, { sortKey: "startT", onRow: (r) => R.openSession(r), limit: 2000 }))));
  }

  function kpi(label, value) {
    return h("div", h("span.eyebrow", label), h("b", value));
  }

  function dayChart(days) {
    const W = 900, H = 150, pad = { l: 44, r: 8, t: 10, b: 22 };
    const max = Math.max(...days.map((d) => d[1]), 1e-9);
    const bw = (W - pad.l - pad.r) / days.length;
    const parts = [];
    const ticks = niceTicks(max, 3);
    for (const t of ticks) {
      const y = pad.t + (H - pad.t - pad.b) * (1 - t / ticks[ticks.length - 1]);
      parts.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="var(--line-2)"/><text x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${esc(usd(t, t < 1 ? 2 : 0))}</text>`);
    }
    const top = ticks[ticks.length - 1];
    days.forEach(([day, v], i) => {
      const bh = ((H - pad.t - pad.b) * v) / top;
      const barW = Math.max(1, Math.min(bw * 0.7, 44));
      const cx = pad.l + i * bw + bw / 2;
      parts.push(`<rect x="${cx - barW / 2}" y="${H - pad.b - bh}" width="${barW}" height="${bh}" fill="var(--accent)" rx="1.5"><title>${esc(day)}: ${esc(usd(v))}</title></rect>`);
      const every = Math.ceil(days.length / 10);
      if (i % every === 0) parts.push(`<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(day.slice(5))}</text>`);
    });
    const el = h("div");
    el.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated spend per day">${parts.join("")}</svg>`;
    return el;
  }

  function niceTicks(max, n) {
    if (!(max > 0)) return [0, 1];
    const raw = max / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
    const out = [];
    for (let v = 0; v <= max + step * 0.999; v += step) out.push(+v.toPrecision(12));
    if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
    return out;
  }

  /** Space: play/pause · ←/→: step · /: search. Ignored while typing or when this view is hidden. */
  function onKey(e) {
    if (!S.session || !S.view || S.root.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) {
      if (e.key === "Escape" && e.target === S.view.search) {
        e.target.value = "";
        S.query = "";
        R.renderFeed();
        e.target.blur();
      }
      return;
    }
    if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); R.togglePlay(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); R.stop(); R.step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); R.stop(); R.step(-1); }
    else if (e.key === "/") { e.preventDefault(); S.view.search.focus(); }
  }

  function onHide() {
    R.stop();
    AFD.ui.hideTip();
  }

  Object.assign(R, { mount, setNotice, setProgress, loadExample, loadEntries, showFleet, kpi, dayChart, niceTicks, onKey, onHide });
  AFD.recorder = { mount, onHide, loadEntries: (e) => loadEntries(e), reportMarkdown: (s) => R.reportMarkdown(s), repriceAll: (s) => R.repriceAll(s), _state: S };
})(globalThis.AFD = globalThis.AFD || {});
