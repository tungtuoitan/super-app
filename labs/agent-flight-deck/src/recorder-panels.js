/* Agent Flight Deck — Flight Recorder: inspector, cost chart, tools/files/turns tables, report and re-pricing. */
(function (AFD) {
  "use strict";

  const { h, clear, esc, usd, tok, pct, dur, clock, dateTime, date, plural, catColor, CAT_LABEL } = AFD.ui;
  const R = (AFD.rec = AFD.rec || {});
  const { S, KIND_LABEL, FILTERS, IDLE_MS, GAP_CAP_MS } = R;

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
      const rec = s.reconcile;
      if (rec && rec.models.length) {
        v.inspector.appendChild(h("div", h("h4", "Compared with Claude Code's own total"),
          h("table.tbl", h("thead", h("tr", h("th", "Model"), h("th.num", "Logged"), h("th.num", "Estimate"))), h("tbody",
            rec.models.map((m) => h("tr", h("td", m.name), h("td.num", usd(m.loggedUsd)), h("td.num", usd(m.estimateUsd)))))),
          h("div", { style: { fontSize: "11.5px", color: "var(--muted)", marginTop: "6px" } },
            (rec.partial ? "Up to Claude Code's last cost snapshot. " : "") + (rec.hiddenTokens > 0 ? `Claude Code counted about ${tok(rec.hiddenTokens)} tokens from requests the transcript does not record (titles, summaries and other background calls).` : "The transcript accounts for every token Claude Code counted."))));
      }
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
      const facts = [["Category", CAT_LABEL[t.category]], ["Duration", t.endT ? dur(t.ms) : "no result logged"], ["Result size", t.resultChars ? `${t.resultChars.toLocaleString("en-US")} chars ≈ ${tok(AFD.pricing.charsToTokens(t.resultChars))} tok` : "—"]];
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
    const ticks = R.niceTicks(max, 3);
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
      if (c.events.length) { R.stop(); R.select(c.events[0], true); }
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
      { key: "resultChars", label: "Output ≈tok", num: true, render: (r) => tok(AFD.pricing.charsToTokens(r.resultChars)) },
      { key: "bar", label: "", sortable: false, render: (r) => h("div.minibar", h("i", { style: { width: (r.count / max) * 100 + "%", background: catColor(r.category) } })) },
    ], s.toolStats, { sortKey: "count", onRow: (r) => { S.query = r.name.toLowerCase(); S.view.search.value = r.name; R.renderFeed(); S.view.feed.scrollIntoView({ block: "nearest", behavior: "smooth" }); } });
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
    ], s.files, { sortKey: "heat", onRow: (r) => { const q = rel(r.path); S.query = q.toLowerCase(); S.view.search.value = q; R.renderFeed(); S.view.feed.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }));
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
    ], rows, { sortKey: "idx", asc: true, onRow: (r) => { R.stop(); R.select(r.startEvent, true); S.view.tlWrap.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }));
  }

  Object.assign(R, { renderInspector, repriceAll, reportMarkdown, costBlock, costChart, toolsTable, filesTable, turnsTable });
})(globalThis.AFD = globalThis.AFD || {});
