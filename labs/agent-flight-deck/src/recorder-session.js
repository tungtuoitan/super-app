/* Agent Flight Deck — Flight Recorder: the session view, transcript, selection and replay. */
(function (AFD) {
  "use strict";

  const { h, clear, esc, usd, tok, pct, dur, clock, dateTime, date, plural, catColor, CAT_LABEL } = AFD.ui;
  const R = (AFD.rec = AFD.rec || {});
  const { S, KIND_LABEL, FILTERS, IDLE_MS, GAP_CAP_MS } = R;

  // ───────────────────────── session view ─────────────────────────

  function openSession(s) {
    stop();
    S.session = s;
    S.cursor = -1;
    S.selected = -1;
    S.query = "";
    // thinking text is often not written to the log: start with the Thinking chip off; thinking that has text still shows
    if (s.events.some((e) => e.kind === "thinking" && !e.text)) S.filters.delete("thinking");
    else S.filters.add("thinking");
    clear(S.content);
    const v = (S.view = {});
    const t = s.totals;
    const reported = s.reportedCost;

    if (S.sessions.length > 1) S.content.appendChild(h("button.btn.ghost.back", { type: "button", onclick: () => R.showFleet() }, "← All sessions"));

    // header
    const models = s.byModel.filter((m) => m.calls).map((m) => h("span.pill.model", { title: m.model }, m.name));
    S.content.appendChild(h("header.rec-head",
      h("div.rec-title", h("h1", s.title), S.isExample ? h("span.pill.example", { title: "Invented session that ships with the app, so you can try every feature" }, "Example session") : null,
        h("button.btn.sm", { type: "button", title: "Copy a Markdown summary for a PR description or a team chat", onclick: async () => {
          const ok = await AFD.ui.copyText(R.reportMarkdown(s));
          AFD.ui.toast(ok ? "Report copied as Markdown. It quotes your prompts, so check it before sharing." : "Copy was blocked by the browser");
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
      gauge("Est. cost", usd(t.cost), reported && s.reconcile ? `${s.reconcile.partial ? "up to its last snapshot, " : ""}Claude Code logged ${usd(reported.usd)} vs est. ${usd(s.reconcile.estimateUsd)}` : t.unpricedCalls ? `${t.unpricedCalls} calls unpriced` : "at API list prices", costBar,
        "Every call priced at Anthropic's API list prices. Pro and Max plans are billed differently, so this is what the same work would cost through the API." + (reported ? " Claude Code also saves its own running total in the log, sometimes only up to an earlier point in the session; see the Inspector for the comparison." : "")),
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
    const onSearch = () => { S.query = v.search.value.trim().toLowerCase(); renderFeed(); };
    v.search.addEventListener("input", onSearch);
    v.search.addEventListener("search", onSearch); // fires when the browser clears the box (Escape, the ✕)
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
      h("div.panel", h("div.panel-h", h("h3", "Cost per API call"), h("span.hint", "Stacked by billing component; line is the running total")), h("div.panel-b", R.costChart(s))),
      h("div.panel", h("div.panel-h", h("h3", "Tools")), R.toolsTable(s)),
      h("div.panel", h("div.panel-h", h("h3", "Files touched"), h("span.hint", "Click to filter the transcript")), R.filesTable(s)),
      h("div.panel", h("div.panel-h", h("h3", "Turns"), h("span.hint", "One turn per prompt")), R.turnsTable(s)));
    S.content.appendChild(charts);

    R.drawTimeline();
    renderFeed();
    R.renderInspector();
    updatePos();
    if (v.resizeObs) v.resizeObs.disconnect();
    if (window.ResizeObserver) {
      let lastW = v.tlWrap.clientWidth;
      v.resizeObs = new ResizeObserver(() => {
        const w = v.tlWrap.clientWidth;
        if (Math.abs(w - lastW) > 4) { lastW = w; R.drawTimeline(); }
      });
      v.resizeObs.observe(v.tlWrap);
    }
  }

  function gauge(label, value, sub, barKids, title) {
    return h("div.gauge", { title: title || null }, h("span.eyebrow", label), h("div.v", value), h("div.s", { title: sub }, sub), barKids ? h("div.bar", barKids) : null);
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
    v.drawnSel = null;
    v.drawnCursor = null;
    for (const ev of s.events) {
      if (!(kinds.has(ev.kind) || (ev.kind === "thinking" && ev.text)) || !matchesQuery(ev, q)) continue;
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
    R.renderInspector();
    updatePos();
  }

  function setCursor(idx, scroll) {
    S.cursor = idx;
    S.selected = idx;
    updateCursor(scroll);
    R.renderInspector();
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
      // touch only the rows whose state changed: the old and new selection, and the rows the cursor crossed
      const mark = (idx, on) => {
        const row = v.rows.get(idx);
        if (!row) return;
        row.classList.toggle("cur", on);
        const txt = row.querySelector(".txt");
        if (txt) txt.classList.toggle("clamp", !on);
      };
      if (v.drawnSel !== cur) { if (v.drawnSel != null) mark(v.drawnSel, false); mark(cur, true); v.drawnSel = cur; }
      const from = v.drawnCursor == null ? -2 : v.drawnCursor;
      if (from !== S.cursor) {
        if (from < 0 || S.cursor < 0) {
          for (const [idx, row] of v.rows) row.classList.toggle("future", S.cursor >= 0 && idx > S.cursor);
        } else {
          const lo = Math.min(from, S.cursor);
          const hi = Math.max(from, S.cursor);
          for (let i = lo + 1; i <= hi; i++) { const row = v.rows.get(i); if (row) row.classList.toggle("future", i > S.cursor); }
        }
        v.drawnCursor = S.cursor;
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

  Object.assign(R, { openSession, gauge, toolArg, short, matchesQuery, visibleKinds, renderFeed, feedRow, select, setCursor, updateCursor, updatePos, togglePlay, scheduleNext, step, stop });
})(globalThis.AFD = globalThis.AFD || {});
