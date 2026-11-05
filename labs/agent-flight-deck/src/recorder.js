/* Agent Flight Deck — Flight Recorder view: replay and analyze Claude Code sessions. */
(function (AFD) {
  "use strict";

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
    openSession(res.sessions[0]);
  }

  async function loadEntries(entries) {
    const logs = entries.filter((e) => e.file && /\.jsonl$/i.test(e.path));
    if (!logs.length) {
      setNotice(entries.length ? "No .jsonl files found. Claude Code keeps session logs in ~/.claude/projects/<project>/<session>.jsonl." : "Nothing to load.", true);
      return;
    }
    stop();
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
    setNotice(notes.join(" "));
    if (res.sessions.length === 1) openSession(res.sessions[0]);
    else showFleet();
  }

  // ───────────────────────── fleet (many sessions) ─────────────────────────

  function showFleet() {
    stop();
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
        ], ss.slice().sort((a, b) => b.totals.cost - a.totals.cost).slice(0, 8), { sortKey: "cost", onRow: openSession }))),
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
      ], ss, { sortKey: "startT", onRow: openSession, limit: 2000 }))));
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

  // ───────────────────────── session view ─────────────────────────

  function openSession(s) {
    stop();
    S.session = s;
    S.cursor = -1;
    S.selected = -1;
    S.query = "";
    clear(S.content);
    const v = (S.view = {});
    const t = s.totals;
    const reported = s.reportedCost;

    if (S.sessions.length > 1) S.content.appendChild(h("button.btn.ghost.back", { type: "button", onclick: showFleet }, "← All sessions"));

    // header
    const models = s.byModel.filter((m) => m.calls).map((m) => h("span.pill.model", { title: m.model }, m.name));
    S.content.appendChild(h("header.rec-head",
      h("div.rec-title", h("h1", s.title), S.isExample ? h("span.pill.example", { title: "Invented session that ships with the app, so you can try every feature" }, "Example session") : null,
        h("button.btn.sm", { type: "button", title: "Copy a Markdown summary for a PR description or a team chat", onclick: async () => {
          const ok = await AFD.ui.copyText(reportMarkdown(s));
          AFD.ui.toast(ok ? "Report copied as Markdown" : "Copy was blocked by the browser");
        } }, AFD.ui.icon("copy"), "Copy report")),
      h("div.rec-meta",
        s.project ? h("span", "Project ", h("b.mono", s.project)) : null,
        s.meta.gitBranch ? h("span", "Branch ", h("span.mono", s.meta.gitBranch)) : null,
        s.startT ? h("span", dateTime(s.startT)) : null,
        s.meta.version ? h("span", "Claude Code ", h("span.mono", s.meta.version)) : null,
        models)));

    // gauges
    const parts = t.costParts;
    const costBar = t.cost > 0 ? [["input", "--c-input"], ["cacheWrite", "--c-cwrite"], ["cacheRead", "--c-cread"], ["output", "--c-output"]].map(([k, c]) => h("i", { style: { width: (parts[k] / t.cost) * 100 + "%", background: `var(${c})` } })) : null;
    const peakRatio = s.peak.window ? s.peak.ctx / s.peak.window : 0;
    S.content.appendChild(h("section.gauges", { "aria-label": "Session summary" },
      gauge("Est. cost", usd(t.cost), reported ? `Claude Code logged ${usd(reported.usd)}` : t.unpricedCalls ? `${t.unpricedCalls} calls unpriced` : "at API list prices", costBar,
        reported ? "Claude Code saves its own running total in the log, sometimes only up to an earlier point in the session. The estimate here prices every call at Anthropic's API list prices." : null),
      gauge("API calls", t.apiCalls.toLocaleString("en-US"), `${plural(s.promptCount, "prompt")} · ${plural(s.turns.filter((x) => x.calls.length).length, "turn")}`),
      gauge("Tool calls", s.tools.length.toLocaleString("en-US"), s.tools.length ? `${s.tools.filter((x) => x.isError).length} failed` : "none"),
      gauge("Active time", dur(s.activeMs), `of ${dur(s.wallMs)} wall time`),
      gauge("Cache hit", pct(t.cacheHit), `${tok(t.cacheRead)} of ${tok(t.input + t.cacheRead + t.cacheWrite)} prompt tok`, [h("i", { style: { width: t.cacheHit * 100 + "%", background: "var(--c-cread)" } })]),
      gauge("Peak context", tok(s.peak.ctx), `${pct(peakRatio)} of ${tok(s.peak.window)} window`, [h("i", { style: { width: Math.min(100, peakRatio * 100) + "%", background: peakRatio > 0.75 ? "var(--bad)" : peakRatio > 0.5 ? "var(--warn)" : "var(--good)" } })])));

    // findings
    if (s.insights.length) {
      const list = h("div.findings", { style: { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", display: "grid" } },
        s.insights.map((f) => h("div.finding." + f.level,
          h("div.stripe"),
          h("div.ft", h("span.sev." + f.level, f.level === "warn" ? "Check" : f.level === "good" ? "Good" : "Note"), f.title),
          h("div.fd", f.detail),
          f.refs && f.refs.length ? h("div.fr", h("span.hint", { style: { fontSize: "11px", color: "var(--faint)" } }, "Jump to:"), f.refs.slice(0, 8).map((ref) => h("button", { type: "button", onclick: () => select(ref, true), title: "Show this moment in the replay" }, "#" + (ref + 1) + " " + clock(s.events[ref] && s.events[ref].t)))) : null)));
      S.content.appendChild(h("section.panel", { style: { marginBottom: "14px" } }, h("div.panel-h", h("h2", "Findings"), h("span.hint", "What the log says about cost and efficiency")), list));
    }

    // timeline + feed + inspector
    v.tlWrap = h("div.tl-wrap");
    v.legend = h("div.tl-legend");
    v.scrub = h("input", { type: "range", min: 0, max: Math.max(0, s.events.length - 1), value: s.events.length - 1, step: 1, "aria-label": "Replay position", id: "rec-scrub" });
    v.scrub.addEventListener("input", () => { stop(); setCursor(+v.scrub.value, true); });
    v.playBtn = h("button.play-btn", { type: "button", "aria-label": "Play replay", onclick: togglePlay });
    v.playBtn.innerHTML = AFD.ui.ICONS.play;
    v.pos = h("span.pos", "");
    const speedSeg = h("div.seg", { role: "group", "aria-label": "Replay speed" }, [1, 4, 16].map((sp) => {
      const b = h("button", { type: "button", "aria-pressed": String(S.speed === sp), onclick: () => { S.speed = sp; [...speedSeg.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b))); } }, sp + "×");
      return b;
    }));
    const stepBtn = (dir, name, label) => {
      const b = h("button.icon-btn", { type: "button", "aria-label": label, onclick: () => { stop(); step(dir); } });
      b.innerHTML = AFD.ui.ICONS[name];
      return b;
    };

    v.feed = h("div.feed", { style: { position: "relative" }, tabindex: "0", "aria-label": "Session transcript" });
    v.search = h("input", { type: "search", placeholder: "Search transcript, files, commands", "aria-label": "Search transcript", id: "rec-search" });
    v.search.addEventListener("input", () => { S.query = v.search.value.trim().toLowerCase(); renderFeed(); });
    const filterBtns = h("div.filters", FILTERS.map((f) => {
      const b = h("button", { type: "button", "aria-pressed": String(S.filters.has(f.key)), onclick: () => {
        if (S.filters.has(f.key)) S.filters.delete(f.key); else S.filters.add(f.key);
        b.setAttribute("aria-pressed", String(S.filters.has(f.key)));
        renderFeed();
      } }, f.label);
      return b;
    }));
    v.inspector = h("div.panel-b.insp");

    S.content.appendChild(h("section.rec-grid",
      h("div.rec-main",
        h("div.panel",
          h("div.panel-h", h("h2", "Flight path"), h("span.hint", "Pauses over 1 minute are shortened; zigzags mark pauses over 5 minutes. Click to inspect."), h("span.spacer"), h("span.hint", { style: { fontFamily: "var(--f-mono)", fontSize: "11px" } }, "Space play · ← → step · / search")),
          v.tlWrap, v.legend,
          h("div.player", v.playBtn, stepBtn(-1, "prev", "Previous event"), stepBtn(1, "next", "Next event"), v.scrub, v.pos, speedSeg)),
        h("div.panel",
          h("div.panel-h", h("h2", "Transcript"), h("span.spacer"), h("div.feed-tools", v.search)),
          h("div", { style: { padding: "8px 14px", borderBottom: "1px solid var(--line-2)" } }, filterBtns),
          v.feed)),
      h("aside.rec-side", h("div.panel", h("div.panel-h", h("h2", "Inspector")), v.inspector))));

    // analysis panels
    const charts = h("section.charts", { style: { marginTop: "14px" } },
      h("div.panel", h("div.panel-h", h("h3", "Cost per API call"), h("span.hint", "Stacked by billing component; line is the running total")), h("div.panel-b", costChart(s))),
      h("div.panel", h("div.panel-h", h("h3", "Tools")), toolsTable(s)),
      h("div.panel", h("div.panel-h", h("h3", "Files touched"), h("span.hint", "Click to filter the transcript")), filesTable(s)),
      h("div.panel", h("div.panel-h", h("h3", "Turns"), h("span.hint", "One turn per prompt")), turnsTable(s)));
    S.content.appendChild(charts);

    drawTimeline();
    renderFeed();
    renderInspector();
    updatePos();
    if (v.resizeObs) v.resizeObs.disconnect();
    if (window.ResizeObserver) {
      let lastW = v.tlWrap.clientWidth;
      v.resizeObs = new ResizeObserver(() => {
        const w = v.tlWrap.clientWidth;
        if (Math.abs(w - lastW) > 4) { lastW = w; drawTimeline(); }
      });
      v.resizeObs.observe(v.tlWrap);
    }
  }

  function gauge(label, value, sub, barKids, title) {
    return h("div.gauge", { title: title || null }, h("span.eyebrow", label), h("div.v", value), h("div.s", { title: sub }, sub), barKids ? h("div.bar", barKids) : null);
  }

  // ───────────────────────── time compression ─────────────────────────

  function compressTime(times) {
    const pts = [...new Set(times.filter((t) => t > 0))].sort((a, b) => a - b);
    if (pts.length < 2) return null;
    const us = [0];
    const gaps = [];
    for (let i = 1; i < pts.length; i++) {
      const g = pts[i] - pts[i - 1];
      const c = Math.min(g, GAP_CAP_MS);
      us.push(us[i - 1] + c);
      if (g > IDLE_MS) gaps.push({ u: us[i - 1] + c / 2, ms: g });
    }
    const total = us[us.length - 1] || 1;
    const find = (t) => {
      let lo = 0, hi = pts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (pts[mid] <= t) lo = mid; else hi = mid - 1;
      }
      return lo;
    };
    return {
      total,
      gaps,
      map(t) {
        if (!t || t <= pts[0]) return 0;
        if (t >= pts[pts.length - 1]) return total;
        const i = find(t);
        const span = pts[i + 1] - pts[i];
        return us[i] + ((t - pts[i]) / span) * (us[i + 1] - us[i]);
      },
      inverse(u) {
        let i = 0;
        while (i < us.length - 2 && us[i + 1] < u) i++;
        const span = us[i + 1] - us[i] || 1;
        return pts[i] + ((u - us[i]) / span) * (pts[i + 1] - pts[i]);
      },
    };
  }

  // ───────────────────────── timeline ─────────────────────────

  function drawTimeline() {
    const s = S.session;
    const v = S.view;
    if (!s || !v) return;
    const W = Math.max(640, v.tlWrap.clientWidth || 800);
    const L = 74, R = 58;
    const lanes = { prompt: [18, 18], claude: [40, 16], tools: [62, 30], ctx: [104, 66], spend: [182, 34] };
    const H = 236;
    const plotW = W - L - R;
    const comp = compressTime(s.events.map((e) => e.t).concat(s.tools.map((t) => t.endT)));
    const n = s.events.length || 1;
    const xOfEvent = (ev) => (comp ? L + (comp.map(ev.t) / comp.total) * plotW : L + (ev.idx / Math.max(1, n - 1)) * plotW);
    const xOfT = (t, fallbackIdx) => (comp && t ? L + (comp.map(t) / comp.total) * plotW : L + ((fallbackIdx || 0) / Math.max(1, n - 1)) * plotW);
    const p = [];

    // lane backgrounds & labels
    const laneNames = [["prompt", "PROMPTS"], ["claude", "CLAUDE"], ["tools", "TOOLS"], ["ctx", "CONTEXT"], ["spend", "SPEND"]];
    for (const [k, label] of laneNames) {
      const [y, hh] = lanes[k];
      p.push(`<rect x="${L}" y="${y}" width="${plotW}" height="${hh}" fill="var(--panel-2)" rx="2"/>`);
      p.push(`<text class="lane-label" x="10" y="${y + hh / 2 + 3.5}">${label}</text>`);
    }

    // collapsed idle gaps
    if (comp) for (const g of comp.gaps) {
      const x = L + (g.u / comp.total) * plotW;
      const zig = [];
      for (let y = 16; y <= 218; y += 8) zig.push(`${x + ((y / 8) % 2 ? 3 : -3)},${y}`);
      p.push(`<polyline points="${zig.join(" ")}" fill="none" stroke="var(--faint)" stroke-width="1" opacity="0.7"/>`);
      p.push(`<text x="${x}" y="12" text-anchor="middle" style="font-size:9.5px">+${esc(dur(g.ms))}</text>`);
    }

    // compaction markers
    for (const ev of s.events) if (ev.kind === "compact") {
      const x = xOfEvent(ev);
      p.push(`<line x1="${x}" x2="${x}" y1="${lanes.ctx[0]}" y2="${lanes.ctx[0] + lanes.ctx[1]}" stroke="var(--warn)" stroke-dasharray="3 2"/>`);
    }

    // prompts & claude lane
    for (const ev of s.events) {
      const x = xOfEvent(ev);
      if ((ev.kind === "prompt" || ev.kind === "command" || ev.kind === "interrupt") && !ev.sidechain) {
        const y = lanes.prompt[0] + lanes.prompt[1] / 2;
        const fill = ev.kind === "prompt" ? "var(--accent)" : "var(--faint)";
        p.push(`<path d="M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z" fill="${fill}"/>`);
      } else if (ev.kind === "text" || ev.kind === "thinking" || ev.kind === "error" || ev.kind === "subprompt") {
        const y = lanes.claude[0];
        const hh = lanes.claude[1];
        if (ev.kind === "thinking") p.push(`<circle cx="${x}" cy="${y + hh / 2}" r="3" fill="none" stroke="var(--muted)" stroke-width="1.2"/>`);
        else p.push(`<rect x="${x - 1}" y="${y + 2}" width="2.2" height="${hh - 4}" fill="${ev.kind === "error" ? "var(--bad)" : ev.sidechain ? "var(--c-agent)" : "var(--ink)"}" opacity="${ev.sidechain ? 0.7 : 0.85}"/>`);
      }
    }

    // tools
    const cats = new Set();
    for (const t of s.tools) {
      const ev = s.events[t.event];
      const x1 = xOfEvent(ev);
      const x2 = t.endT ? Math.max(x1 + 2.5, xOfT(t.endT, t.event)) : x1 + 2.5;
      const row = t.idx % 2;
      const y = lanes.tools[0] + 2 + row * 14;
      cats.add(t.category);
      p.push(`<rect x="${x1}" y="${y}" width="${Math.max(2.5, x2 - x1)}" height="12" rx="1.5" fill="${catColor(t.category)}" ${t.sidechain ? 'opacity="0.55"' : ""} ${t.isError ? 'stroke="var(--bad)" stroke-width="2"' : ""}/>`);
    }

    // context area
    const main = s.calls.filter((c) => !c.sidechain && c.usage && !c.isError && c.ctx > 0);
    const ctxMax = Math.max(1, ...main.map((c) => c.ctx)) * 1.12;
    const [cy, ch] = lanes.ctx;
    if (main.length) {
      const pts = main.map((c) => {
        const ev = c.events.length ? s.events[c.events[0]] : null;
        const x = ev ? xOfEvent(ev) : xOfT(c.t, 0);
        return [x, cy + ch - (c.ctx / ctxMax) * ch];
      });
      const line = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join("");
      p.push(`<path d="${line}L${pts[pts.length - 1][0].toFixed(1)} ${cy + ch}L${pts[0][0].toFixed(1)} ${cy + ch}Z" fill="var(--c-read)" opacity="0.14"/>`);
      p.push(`<path d="${line}" fill="none" stroke="var(--c-read)" stroke-width="1.6"/>`);
      const peakPt = pts[main.findIndex((c) => c.idx === s.peak.call)];
      if (peakPt) p.push(`<circle cx="${peakPt[0]}" cy="${peakPt[1]}" r="3.2" fill="var(--c-read)"/>`);
      p.push(`<text x="${W - R + 6}" y="${cy + 9}">${esc(tok(ctxMax / 1.12))}</text>`);
      const win = s.peak.window;
      if (win && win < ctxMax) {
        const wy = cy + ch - (win / ctxMax) * ch;
        p.push(`<line x1="${L}" x2="${W - R}" y1="${wy}" y2="${wy}" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="${W - R + 6}" y="${wy + 3}" style="fill:var(--bad)">limit</text>`);
      }
    }

    // spend: cumulative cost step line
    const [sy, sh] = lanes.spend;
    const priced = s.calls.filter((c) => c.cost);
    if (priced.length && s.totals.cost > 0) {
      let acc = 0;
      let d = `M${L} ${sy + sh}`;
      for (const c of priced) {
        const ev = c.events.length ? s.events[c.events[0]] : null;
        const x = ev ? xOfEvent(ev) : xOfT(c.t, 0);
        d += `L${x.toFixed(1)} ${(sy + sh - (acc / s.totals.cost) * (sh - 4)).toFixed(1)}`;
        acc += c.cost.total;
        d += `L${x.toFixed(1)} ${(sy + sh - (acc / s.totals.cost) * (sh - 4)).toFixed(1)}`;
      }
      d += `L${W - R} ${(sy + 4).toFixed(1)}`;
      p.push(`<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6"/>`);
      p.push(`<text x="${W - R + 6}" y="${sy + 8}" style="fill:var(--accent)">${esc(usd(s.totals.cost))}</text>`);
    }

    // time axis
    if (comp) {
      const ticks = Math.max(2, Math.floor(plotW / 110));
      for (let i = 0; i <= ticks; i++) {
        const u = (comp.total * i) / ticks;
        const x = L + (u / comp.total) * plotW;
        p.push(`<text x="${x}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === ticks ? "end" : "middle"}">${esc(clock(comp.inverse(u)))}</text>`);
      }
    } else {
      p.push(`<text x="${L}" y="${H - 6}">event 1</text><text x="${W - R}" y="${H - 6}" text-anchor="end">event ${n}</text>`);
    }

    // cursor
    p.push(`<line class="tl-cursor" x1="0" x2="0" y1="14" y2="${H - 16}" stroke="var(--accent)" stroke-width="1.5" visibility="hidden"/>`);
    p.push(`<line class="tl-hover" x1="0" x2="0" y1="14" y2="${H - 16}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 2" visibility="hidden" opacity="0.5"/>`);

    v.tlWrap.innerHTML = `<svg class="tl-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Session timeline">${p.join("")}</svg>`;
    const svg = v.tlWrap.firstChild;
    v.tlCursor = svg.querySelector(".tl-cursor");
    v.tlHover = svg.querySelector(".tl-hover");
    v.xs = s.events.map((ev) => ({ x: xOfEvent(ev), idx: ev.idx }));
    v.tlW = W;
    v.L = L;
    v.R = R;

    const nearest = (clientX) => {
      const r = svg.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * W;
      let best = null;
      let bd = Infinity;
      for (const q of v.xs) {
        const d = Math.abs(q.x - x);
        if (d < bd || (d === bd && preferKind(s.events[q.idx]))) { bd = d; best = q; }
      }
      return { q: best, x };
    };
    svg.addEventListener("pointermove", (e) => {
      const { q } = nearest(e.clientX);
      if (!q) return;
      v.tlHover.setAttribute("x1", q.x);
      v.tlHover.setAttribute("x2", q.x);
      v.tlHover.setAttribute("visibility", "visible");
      AFD.ui.tip(e, eventTip(s.events[q.idx]));
    });
    svg.addEventListener("pointerleave", () => { v.tlHover.setAttribute("visibility", "hidden"); AFD.ui.hideTip(); });
    svg.addEventListener("click", (e) => {
      const { q } = nearest(e.clientX);
      if (q) { stop(); select(q.idx, true); }
    });

    v.legend.innerHTML = [...cats].sort().map((c) => `<span><i class="swatch" style="background:${catColor(c)}"></i>${esc(CAT_LABEL[c])}</span>`).join("") +
      `<span><i class="swatch" style="background:var(--accent);transform:rotate(45deg);border-radius:1px"></i>Prompt</span><span><i class="swatch" style="background:var(--c-read);opacity:.5"></i>Context size</span><span><i class="swatch" style="background:var(--accent);height:2px"></i>Cumulative cost</span>`;
    updateCursor();
  }

  function preferKind(ev) {
    return ev && (ev.kind === "prompt" || ev.kind === "tool");
  }

  function eventTip(ev) {
    const s = S.session;
    const head = `<b>${esc(KIND_LABEL[ev.kind] || ev.kind)}</b> · ${esc(clock(ev.t))}${ev.sidechain ? " · subagent" : ""}`;
    if (ev.kind === "tool") {
      const t = s.tools[ev.tool];
      return `${head}\n<b>${esc(t.name)}</b> ${esc(toolArg(t).slice(0, 120))}${t.ms ? "\n" + esc(dur(t.ms)) : ""}${t.isError ? "\nFailed" : ""}`;
    }
    if (ev.kind === "thinking") return head + (ev.ms ? `\nThought for ${(ev.ms / 1000).toFixed(1)}s` : "");
    return head + "\n" + esc((ev.text || "").slice(0, 220)) + ((ev.text || "").length > 220 ? "…" : "");
  }

  // ───────────────────────── feed ─────────────────────────

  function toolArg(t) {
    const i = t.input || {};
    const s = S.session;
    const rel = (p) => {
      const cwd = s && s.meta.cwd;
      return cwd && typeof p === "string" && p.startsWith(cwd + "/") ? p.slice(cwd.length + 1) : p;
    };
    if (i.file_path || i.notebook_path) return rel(i.file_path || i.notebook_path) + (i.offset ? `:${i.offset}` : "");
    if (i.command) return String(i.command);
    if (i.pattern) return String(i.pattern) + (i.path ? "  in " + rel(i.path) : "");
    if (i.url) return String(i.url);
    if (i.query) return String(i.query);
    if (i.description) return String(i.description);
    if (i.prompt) return String(i.prompt);
    if (i.skill) return String(i.skill);
    const keys = Object.keys(i);
    return keys.length ? keys.slice(0, 3).map((k) => `${k}: ${short(i[k])}`).join("  ") : "";
  }

  function short(v) {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s && s.length > 60 ? s.slice(0, 60) + "…" : s;
  }

  function matchesQuery(ev, q) {
    if (!q) return true;
    if (ev.text && ev.text.toLowerCase().includes(q)) return true;
    if (ev.kind === "tool") {
      const t = S.session.tools[ev.tool];
      if (t.name.toLowerCase().includes(q)) return true;
      if (toolArg(t).toLowerCase().includes(q)) return true;
      if (t.result && t.result.toLowerCase().includes(q)) return true;
    }
    return false;
  }

  function visibleKinds() {
    const kinds = new Set();
    for (const f of FILTERS) if (S.filters.has(f.key)) f.kinds.forEach((k) => kinds.add(k));
    return kinds;
  }

  function renderFeed() {
    const s = S.session;
    const v = S.view;
    if (!s || !v) return;
    clear(v.feed);
    const kinds = visibleKinds();
    const q = S.query;
    let count = 0;
    const frag = document.createDocumentFragment();
    v.rows = new Map();
    for (const ev of s.events) {
      if (!kinds.has(ev.kind) || !matchesQuery(ev, q)) continue;
      const row = feedRow(ev);
      v.rows.set(ev.idx, row);
      frag.appendChild(row);
      count++;
    }
    if (!count) frag.appendChild(h("div", { style: { padding: "18px 14px", color: "var(--muted)" } }, q ? `Nothing in this session matches “${S.query}”.` : "All event types are filtered out."));
    v.feed.appendChild(frag);
    updateCursor(false);
  }

  function feedRow(ev) {
    const s = S.session;
    let body;
    if (ev.kind === "tool") {
      const t = s.tools[ev.tool];
      body = h("div.toolline",
        h("span.toolname", { style: { background: catColor(t.category) } }, t.name.replace(/^mcp__([^_]+(?:_[^_]+)*)__/, "mcp:")),
        h("span.toolarg", { title: toolArg(t) }, toolArg(t)),
        t.isError ? h("span.tool-err", "failed") : null,
        t.ms >= 1000 ? h("span.tool-ms", dur(t.ms)) : null);
    } else if (ev.kind === "thinking") {
      body = h("div", h("span.who", "Thinking"), h("span.txt", ev.text ? ev.text : ev.ms ? `Thought for ${(ev.ms / 1000).toFixed(1)}s (text hidden by the model)` : "Thinking text hidden by the model"));
    } else {
      const text = ev.text || "";
      body = h("div", h("span.who", KIND_LABEL[ev.kind] || ev.kind), h("div.txt.clamp", text.length > 1200 ? text.slice(0, 1200) + "…" : text));
    }
    const row = h("div.ev.k-" + ev.kind + (ev.sidechain ? ".side" : ""), { "data-idx": ev.idx, role: "button", tabindex: "-1" },
      h("div.when", clock(ev.t)), h("div.body", body));
    row.addEventListener("click", () => { stop(); select(ev.idx, false); });
    return row;
  }

  // ───────────────────────── selection & playback ─────────────────────────

  function select(idx, scrollFeed) {
    const s = S.session;
    if (!s || idx == null || idx < 0 || idx >= s.events.length) return;
    S.selected = idx;
    // make sure the selected event is visible in the feed
    const ev = s.events[idx];
    const kinds = visibleKinds();
    if (!kinds.has(ev.kind) || !matchesQuery(ev, S.query)) {
      const f = FILTERS.find((x) => x.kinds.includes(ev.kind));
      if (f) S.filters.add(f.key);
      S.query = "";
      if (S.view.search) S.view.search.value = "";
      S.root.querySelectorAll(".filters button").forEach((b, i) => b.setAttribute("aria-pressed", String(S.filters.has(FILTERS[i].key))));
      renderFeed();
    }
    if (S.cursor >= 0) S.cursor = idx;
    S.view.scrub.value = idx;
    updateCursor(scrollFeed !== false);
    renderInspector();
    updatePos();
  }

  function setCursor(idx, scroll) {
    S.cursor = idx;
    S.selected = idx;
    updateCursor(scroll);
    renderInspector();
    updatePos();
  }

  function updateCursor(scroll) {
    const v = S.view;
    const s = S.session;
    if (!v || !s) return;
    const cur = S.selected;
    if (v.tlCursor) {
      const q = cur >= 0 && v.xs ? v.xs[cur] : null;
      if (q) {
        v.tlCursor.setAttribute("x1", q.x);
        v.tlCursor.setAttribute("x2", q.x);
        v.tlCursor.setAttribute("visibility", "visible");
      } else v.tlCursor.setAttribute("visibility", "hidden");
    }
    if (v.rows) {
      for (const [idx, row] of v.rows) {
        row.classList.toggle("cur", idx === cur);
        row.classList.toggle("future", S.cursor >= 0 && idx > S.cursor);
        const txt = row.querySelector(".txt");
        if (txt) txt.classList.toggle("clamp", idx !== cur);
      }
      const row = v.rows.get(cur);
      if (row && scroll) {
        const top = row.offsetTop - v.feed.clientHeight / 3;
        v.feed.scrollTo({ top: Math.max(0, top), behavior: S.playing ? "auto" : "smooth" });
      }
    }
  }

  function updatePos() {
    const v = S.view;
    const s = S.session;
    if (!v || !s) return;
    const i = S.selected >= 0 ? S.selected : s.events.length - 1;
    v.pos.textContent = `${i + 1} / ${s.events.length}`;
  }

  function togglePlay() {
    if (S.playing) { stop(); return; }
    const s = S.session;
    if (!s || !s.events.length) return;
    if (S.cursor < 0 || S.cursor >= s.events.length - 1) setCursor(0, true);
    S.playing = true;
    S.view.playBtn.innerHTML = AFD.ui.ICONS.pause;
    S.view.playBtn.setAttribute("aria-label", "Pause replay");
    scheduleNext();
  }

  function scheduleNext() {
    const s = S.session;
    if (!S.playing || !s) return;
    const cur = s.events[S.cursor];
    const nxt = s.events[S.cursor + 1];
    if (!nxt) { stop(); return; }
    let gap = cur && nxt && cur.t && nxt.t ? Math.min(nxt.t - cur.t, GAP_CAP_MS) : 1000;
    const delay = Math.max(70, Math.min(1400, gap / 12 + 120)) / S.speed;
    S.timer = setTimeout(() => {
      if (!S.playing) return;
      step(1);
      scheduleNext();
    }, delay);
  }

  function step(dir) {
    const s = S.session;
    if (!s) return;
    const kinds = visibleKinds();
    let i = (S.cursor >= 0 ? S.cursor : S.selected >= 0 ? S.selected : dir > 0 ? -1 : s.events.length) + dir;
    while (i >= 0 && i < s.events.length && !kinds.has(s.events[i].kind)) i += dir;
    if (i < 0 || i >= s.events.length) { if (S.playing) stop(); return; }
    setCursor(i, true);
    S.view.scrub.value = i;
  }

  function stop() {
    S.playing = false;
    clearTimeout(S.timer);
    if (S.view && S.view.playBtn) {
      S.view.playBtn.innerHTML = AFD.ui.ICONS.play;
      S.view.playBtn.setAttribute("aria-label", "Play replay");
    }
  }

  // ───────────────────────── inspector ─────────────────────────

  function renderInspector() {
    const s = S.session;
    const v = S.view;
    if (!s || !v) return;
    clear(v.inspector);
    const ev = s.events[S.selected];
    if (!ev) {
      v.inspector.appendChild(h("div.empty-insp", "Click the flight path or a transcript line to see the exact tool input, its result, and what that API call cost. Press play to replay the session step by step."));
      const t = s.totals;
      v.inspector.appendChild(costBlock("Whole session", { input: t.input, cacheWrite: t.cacheWrite, cacheRead: t.cacheRead, output: t.output, thinking: t.thinking }, t.costParts, t.cost));
      if (s.byModel.length) v.inspector.appendChild(h("div", h("h4", "By model"), h("dl.kv", s.byModel.map((m) => [h("dt", `${m.name} · ${plural(m.calls, "call")}`), h("dd", usd(m.cost))]))));
      const alt = repriceAll(s);
      if (alt.length) {
        const max = Math.max(...alt.map((a) => a.cost));
        v.inspector.appendChild(h("div", h("h4", "Same tokens on other models"),
          h("table.tbl", h("tbody", alt.map((a) => h("tr", h("td", a.name), h("td.num", usd(a.cost)),
            h("td", { style: { width: "40%" } }, h("div.minibar", h("i", { style: { width: (a.cost / max) * 100 + "%", background: a.current ? "var(--accent)" : "var(--faint)" } }))))))),
          h("div.hint", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "6px" } }, "Re-prices every call's tokens. Real runs differ: models use different tokenizers and take different paths.")));
      }
      return;
    }
    const turn = s.turns[ev.turn];
    v.inspector.appendChild(h("div",
      h("div.eyebrow", `Event ${ev.idx + 1} · ${clock(ev.t)}${turn ? ` · turn ${turn.idx + 1}` : ""}${ev.sidechain ? " · subagent" : ""}`),
      h("div", { style: { fontFamily: "var(--f-display)", fontWeight: 600, fontSize: "17px", marginTop: "2px" } }, ev.kind === "tool" ? s.tools[ev.tool].name : KIND_LABEL[ev.kind] || ev.kind)));

    if (ev.kind === "tool") {
      const t = s.tools[ev.tool];
      const facts = [["Category", CAT_LABEL[t.category]], ["Duration", t.endT ? dur(t.ms) : "no result logged"], ["Result size", t.resultChars ? `${t.resultChars.toLocaleString("en-US")} chars ≈ ${tok(t.resultChars / 3.5)} tok` : "—"]];
      if (t.isError) facts.push(["Status", "Failed"]);
      v.inspector.appendChild(h("dl.kv", facts.map(([k, val]) => [h("dt", k), h("dd", { style: k === "Status" ? { color: "var(--bad)" } : null }, val)])));
      v.inspector.appendChild(h("div", h("h4", "Input"), h("pre", JSON.stringify(t.input, null, 2).slice(0, 6000))));
      if (t.result) v.inspector.appendChild(h("div", h("h4", t.isError ? "Error" : "Result"), h("pre", { style: t.isError ? { color: "var(--bad)" } : null }, t.result)));
    } else if (ev.text) {
      v.inspector.appendChild(h("pre", { style: { maxHeight: "320px" } }, ev.text.slice(0, 20000)));
    } else if (ev.kind === "thinking") {
      v.inspector.appendChild(h("div.empty-insp", ev.ms ? `Thought for ${(ev.ms / 1000).toFixed(1)} seconds. Current models do not write their thinking text to the log by default.` : "Current models do not write their thinking text to the log by default."));
    }

    const call = ev.call != null ? s.calls[ev.call] : null;
    if (call && call.usage) {
      const box = costBlock(`API call ${call.idx + 1} · ${AFD.pricing.displayName(call.model)}`, { input: call.input, cacheWrite: call.cacheWrite, cacheRead: call.cacheRead, output: call.output, thinking: call.thinkingTokens }, call.cost, call.cost ? call.cost.total : null);
      box.appendChild(h("dl.kv", { style: { marginTop: "8px" } },
        h("dt", "Context sent"), h("dd", `${tok(call.ctx)} / ${tok(call.window)}`),
        call.thinkingMs ? [h("dt", "Thinking time"), h("dd", (call.thinkingMs / 1000).toFixed(1) + "s")] : null));
      v.inspector.appendChild(box);
    }
    if (turn && turn.prompt) {
      v.inspector.appendChild(h("div", h("h4", `Turn ${turn.idx + 1}`), h("dl.kv",
        h("dt", "Prompt"), h("dd", { style: { textAlign: "left", fontFamily: "var(--f-body)", overflowWrap: "anywhere" } }, turn.prompt.length > 160 ? turn.prompt.slice(0, 160) + "…" : turn.prompt),
        h("dt", "Calls · tools"), h("dd", `${turn.calls.length} · ${turn.tools.length}`),
        h("dt", "Duration"), h("dd", dur(turn.ms)),
        h("dt", "Turn cost"), h("dd", usd(turn.cost)))));
    }
  }

  const ALT_MODELS = ["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];

  /** What the same per-call token counts would cost on each current model. */
  function repriceAll(s) {
    const priced = s.calls.filter((c) => c.usage && !c.isError);
    if (!priced.length) return [];
    const used = new Set(s.byModel.map((m) => AFD.pricing.normalizeModel(m.model)));
    return ALT_MODELS.map((m) => {
      let cost = 0;
      for (const c of priced) {
        const r = AFD.pricing.costOf(c.usage, m);
        if (r) cost += r.total;
      }
      return { model: m, name: AFD.pricing.displayName(m), cost, current: used.has(m) };
    });
  }

  function reportMarkdown(s) {
    const t = s.totals;
    const lines = [];
    lines.push(`## Claude Code session: ${s.title}`);
    lines.push("");
    const meta = [s.project && `**Project** ${s.project}`, s.meta.gitBranch && `**Branch** \`${s.meta.gitBranch}\``, s.startT && `**Started** ${dateTime(s.startT)}`].filter(Boolean);
    if (meta.length) lines.push(meta.join(" · "), "");
    lines.push("| Metric | Value |", "|---|---|");
    lines.push(`| Estimated cost (API list prices) | ${usd(t.cost)} |`);
    lines.push(`| API calls / tool calls | ${t.apiCalls} / ${s.tools.length} (${s.tools.filter((x) => x.isError).length} failed) |`);
    lines.push(`| Active time | ${dur(s.activeMs)} of ${dur(s.wallMs)} |`);
    lines.push(`| Prompt cache hit | ${pct(t.cacheHit)} |`);
    lines.push(`| Peak context | ${tok(s.peak.ctx)} of ${tok(s.peak.window)} |`);
    lines.push(`| Models | ${s.byModel.map((m) => `${m.name} (${m.calls} calls, ${usd(m.cost)})`).join(", ")} |`);
    lines.push("");
    if (s.insights.length) {
      lines.push("### Findings");
      for (const f of s.insights) lines.push(`- ${f.level === "warn" ? "⚠️" : f.level === "good" ? "✅" : "ℹ️"} **${f.title}.** ${f.detail}`);
      lines.push("");
    }
    const top = s.turns.filter((x) => x.prompt && x.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 5);
    if (top.length) {
      lines.push("### Most expensive turns");
      for (const x of top) lines.push(`- ${usd(x.cost)} · ${dur(x.ms)} · ${x.tools.length} tools: ${x.prompt.replace(/\s+/g, " ").slice(0, 120)}`);
      lines.push("");
    }
    const files = s.files.filter((f) => f.edits + f.writes > 0).slice(0, 10);
    if (files.length) {
      const cwd = s.meta.cwd;
      lines.push("### Files changed");
      for (const f of files) lines.push(`- \`${cwd && f.path.startsWith(cwd + "/") ? f.path.slice(cwd.length + 1) : f.path}\` +${f.added} −${f.removed}`);
      lines.push("");
    }
    lines.push("_Generated by Agent Flight Deck from the local session log._");
    return lines.join("\n");
  }

  function costBlock(title, tokens, parts, total) {
    const rows = [
      ["Input (uncached)", tokens.input, parts && parts.input, "--c-input"],
      ["Cache write", tokens.cacheWrite, parts && parts.cacheWrite, "--c-cwrite"],
      ["Cache read", tokens.cacheRead, parts && parts.cacheRead, "--c-cread"],
      ["Output", tokens.output, parts && parts.output, "--c-output"],
    ];
    const wrap = h("div", h("h4", title));
    wrap.appendChild(h("table.tbl", h("thead", h("tr", h("th", ""), h("th.num", "Tokens"), h("th.num", "Cost"))), h("tbody",
      rows.map(([label, n, c, color]) => h("tr", h("td", h("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, h("i.swatch", { style: { background: `var(${color})` } }), label)), h("td.num", tok(n)), h("td.num", parts ? usd(c) : "—"))),
      tokens.thinking ? h("tr", h("td", { style: { color: "var(--muted)", paddingLeft: "25px" } }, "of which thinking"), h("td.num", { style: { color: "var(--muted)" } }, tok(tokens.thinking)), h("td")) : null,
      h("tr", h("td", h("b", "Total")), h("td.num", tok(tokens.input + tokens.cacheWrite + tokens.cacheRead + tokens.output)), h("td.num", h("b", total != null ? usd(total) : "unpriced"))))));
    if (parts && total > 0) wrap.appendChild(h("div.costbar", rows.map(([, , c, color]) => h("i", { style: { width: (c / total) * 100 + "%", background: `var(${color})` } }))));
    return wrap;
  }

  // ───────────────────────── analysis panels ─────────────────────────

  function costChart(s) {
    const calls = s.calls.filter((c) => c.cost);
    const el = h("div");
    if (!calls.length) {
      el.appendChild(h("div.empty-insp", "No priced API calls in this session."));
      return el;
    }
    const W = 640, H = 200, pad = { l: 46, r: 46, t: 10, b: 24 };
    const max = Math.max(...calls.map((c) => c.cost.total));
    const ticks = niceTicks(max, 3);
    const top = ticks[ticks.length - 1];
    const bw = (W - pad.l - pad.r) / calls.length;
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    const p = [];
    for (const t of ticks) p.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-2)"/><text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${esc(usd(t, t < 0.1 ? 3 : 2))}</text>`);
    const comps = [["input", "--c-input"], ["cacheWrite", "--c-cwrite"], ["cacheRead", "--c-cread"], ["output", "--c-output"]];
    let acc = 0;
    const line = [];
    calls.forEach((c, i) => {
      let base = 0;
      const x = pad.l + i * bw;
      for (const [k, color] of comps) {
        const v = c.cost[k];
        if (v <= 0) continue;
        p.push(`<rect x="${(x + bw * 0.12).toFixed(2)}" y="${y(base + v).toFixed(2)}" width="${Math.max(0.8, bw * 0.76).toFixed(2)}" height="${(y(base) - y(base + v)).toFixed(2)}" fill="var(${color})" ${c.sidechain ? 'opacity="0.55"' : ""}/>`);
        base += v;
      }
      p.push(`<rect class="hit" data-i="${i}" x="${x.toFixed(2)}" y="${pad.t}" width="${bw.toFixed(2)}" height="${H - pad.t - pad.b}" fill="transparent"/>`);
      acc += c.cost.total;
      line.push([x + bw / 2, acc]);
    });
    const yr = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / acc);
    p.push(`<path d="${line.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + yr(q[1]).toFixed(1)).join("")}" fill="none" stroke="var(--accent)" stroke-width="1.6"/>`);
    p.push(`<text x="${W - pad.r + 6}" y="${pad.t + 8}" style="fill:var(--accent)">${esc(usd(acc))}</text><text x="${W - pad.r + 6}" y="${pad.t + 20}" style="fill:var(--accent);font-size:9px">total</text>`);
    p.push(`<text x="${pad.l}" y="${H - 6}">call 1</text><text x="${W - pad.r}" y="${H - 6}" text-anchor="end">call ${calls.length}</text>`);
    el.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cost per API call">${p.join("")}</svg>`;
    const svg = el.firstChild;
    svg.addEventListener("pointermove", (e) => {
      const r = e.target.closest(".hit");
      if (!r) { AFD.ui.hideTip(); return; }
      const c = calls[+r.getAttribute("data-i")];
      AFD.ui.tip(e, `<b>Call ${c.idx + 1}</b> · ${esc(AFD.pricing.displayName(c.model))}${c.sidechain ? " · subagent" : ""}\n${esc(usd(c.cost.total))}  ·  context ${esc(tok(c.ctx))}\nwrite ${esc(tok(c.cacheWrite))} · read ${esc(tok(c.cacheRead))} · out ${esc(tok(c.output))}`);
    });
    svg.addEventListener("pointerleave", AFD.ui.hideTip);
    svg.addEventListener("click", (e) => {
      const r = e.target.closest(".hit");
      if (!r) return;
      const c = calls[+r.getAttribute("data-i")];
      if (c.events.length) { stop(); select(c.events[0], true); }
    });
    el.appendChild(h("div.tl-legend", { style: { padding: "8px 0 0" } }, [["Input", "--c-input"], ["Cache write", "--c-cwrite"], ["Cache read", "--c-cread"], ["Output", "--c-output"]].map(([l, c]) => h("span", h("i.swatch", { style: { background: `var(${c})` } }), l))));
    return el;
  }

  function toolsTable(s) {
    if (!s.toolStats.length) return h("div.panel-b.empty-insp", "No tool calls.");
    const max = Math.max(...s.toolStats.map((t) => t.count));
    return AFD.ui.table([
      { key: "name", label: "Tool", render: (r) => h("span.toolname", { style: { background: catColor(r.category) } }, r.name.replace(/^mcp__[^_]+(?:_[^_]+)*__/, "mcp:")) },
      { key: "count", label: "Calls", num: true },
      { key: "errors", label: "Failed", num: true, render: (r) => (r.errors ? h("span", { style: { color: "var(--bad)" } }, String(r.errors)) : "0") },
      { key: "ms", label: "Total time", num: true, render: (r) => dur(r.ms) },
      { key: "resultChars", label: "Output ≈tok", num: true, render: (r) => tok(r.resultChars / 3.5) },
      { key: "bar", label: "", sortable: false, render: (r) => h("div.minibar", h("i", { style: { width: (r.count / max) * 100 + "%", background: catColor(r.category) } })) },
    ], s.toolStats, { sortKey: "count", onRow: (r) => { S.query = r.name.toLowerCase(); S.view.search.value = r.name; renderFeed(); S.view.feed.scrollIntoView({ block: "nearest", behavior: "smooth" }); } });
  }

  function filesTable(s) {
    if (!s.files.length) return h("div.panel-b.empty-insp", "No file reads or edits.");
    const cwd = s.meta.cwd;
    const rel = (p) => (cwd && p.startsWith(cwd + "/") ? p.slice(cwd.length + 1) : p);
    const heat = (f) => f.reads + 2 * (f.edits + f.writes);
    const max = Math.max(...s.files.map(heat));
    return h("div", { style: { maxHeight: "360px", overflow: "auto" } }, AFD.ui.table([
      { key: "path", label: "File", render: (r) => h("div.path", { title: r.path }, h("bdi", rel(r.path))), sort: (r) => rel(r.path) },
      { key: "reads", label: "Reads", num: true },
      { key: "edits", label: "Edits", num: true, render: (r) => String(r.edits + r.writes), sort: (r) => r.edits + r.writes },
      { key: "lines", label: "Lines ±", num: true, render: (r) => h("span.tnum", h("span", { style: { color: "var(--good)" } }, "+" + r.added), " ", h("span", { style: { color: "var(--bad)" } }, "−" + r.removed)), sort: (r) => r.added + r.removed },
      { key: "heat", label: "", sortable: false, render: (r) => h("div.minibar", h("i", { style: { width: (r.reads / max) * 100 + "%", background: "var(--c-read)" } }), h("i", { style: { width: ((2 * (r.edits + r.writes)) / max) * 100 + "%", background: "var(--c-edit)" } })) },
    ], s.files, { sortKey: "heat", onRow: (r) => { const q = rel(r.path); S.query = q.toLowerCase(); S.view.search.value = q; renderFeed(); S.view.feed.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }));
  }

  function turnsTable(s) {
    const rows = s.turns.filter((t) => t.prompt || t.calls.length);
    if (!rows.length) return h("div.panel-b.empty-insp", "No turns.");
    const max = Math.max(...rows.map((t) => t.cost), 1e-9);
    return h("div", { style: { maxHeight: "360px", overflow: "auto" } }, AFD.ui.table([
      { key: "idx", label: "#", num: true, render: (r) => String(r.idx + 1), ascFirst: true },
      { key: "prompt", label: "Prompt", render: (r) => h("div.ttl", { title: r.prompt, style: { maxWidth: "260px" } }, r.prompt || "(before first prompt)") },
      { key: "calls", label: "Calls", num: true, render: (r) => String(r.calls.length), sort: (r) => r.calls.length },
      { key: "tools", label: "Tools", num: true, render: (r) => String(r.tools.length), sort: (r) => r.tools.length },
      { key: "ms", label: "Time", num: true, render: (r) => dur(r.ms) },
      { key: "cost", label: "Cost", num: true, render: (r) => usd(r.cost) },
      { key: "bar", label: "", sortable: false, render: (r) => h("div.minibar", h("i", { style: { width: (r.cost / max) * 100 + "%", background: "var(--accent)" } })) },
    ], rows, { sortKey: "idx", asc: true, onRow: (r) => { stop(); select(r.startEvent, true); S.view.tlWrap.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }));
  }

  /** Space: play/pause · ←/→: step · /: search. Ignored while typing or when this view is hidden. */
  function onKey(e) {
    if (!S.session || !S.view || S.root.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) {
      if (e.key === "Escape" && e.target === S.view.search) e.target.blur();
      return;
    }
    if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stop(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stop(); step(-1); }
    else if (e.key === "/") { e.preventDefault(); S.view.search.focus(); }
  }

  function onHide() {
    stop();
    AFD.ui.hideTip();
  }

  AFD.recorder = { mount, onHide, loadEntries, reportMarkdown, repriceAll, _state: S };
})(globalThis.AFD = globalThis.AFD || {});
