/* Agent Flight Deck — Flight Recorder: the flight-path timeline (time compression, lanes, cursor). */
(function (AFD) {
  "use strict";

  const { h, clear, esc, usd, tok, pct, dur, clock, dateTime, date, plural, catColor, CAT_LABEL } = AFD.ui;
  const R = (AFD.rec = AFD.rec || {});
  const { S, KIND_LABEL, FILTERS, IDLE_MS, GAP_CAP_MS } = R;

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
    const L = 74, RM = 58;
    const lanes = { prompt: [18, 18], claude: [40, 16], tools: [62, 30], ctx: [104, 66], spend: [182, 34] };
    const H = 236;
    const plotW = W - L - RM;
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
    let lastLabelX = -1e9;
    if (comp) for (const g of comp.gaps) {
      const x = L + (g.u / comp.total) * plotW;
      const showLabel = x - lastLabelX > 56;
      if (showLabel) lastLabelX = x;
      const zig = [];
      for (let y = 16; y <= 218; y += 8) zig.push(`${x + ((y / 8) % 2 ? 3 : -3)},${y}`);
      p.push(`<polyline points="${zig.join(" ")}" fill="none" stroke="var(--faint)" stroke-width="1" opacity="0.7"/>`);
      if (showLabel) p.push(`<text x="${x}" y="12" text-anchor="middle" style="font-size:9.5px">+${esc(dur(g.ms))}</text>`);
    }

    // compaction markers
    for (const ev of s.events) if (ev.kind === "compact") {
      const x = xOfEvent(ev);
      p.push(`<line x1="${x}" x2="${x}" y1="${lanes.ctx[0]}" y2="${lanes.ctx[0] + lanes.ctx[1]}" stroke="var(--warn)" stroke-dasharray="3 2"/>`);
    }

    // prompts & claude lane (marks on the same pixel are drawn once)
    const seen = new Set();
    for (const ev of s.events) {
      const x = xOfEvent(ev);
      const key = ev.kind + (ev.sidechain ? "s" : "") + ":" + Math.round(x * 2);
      if (seen.has(key)) continue;
      seen.add(key);
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
      const tkey = "t" + t.category + (t.isError ? "e" : "") + (t.idx % 2) + ":" + Math.round(x1 * 2);
      if (!t.endT || t.ms < 2000) { if (seen.has(tkey)) continue; seen.add(tkey); }
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
      p.push(`<text x="${W - RM + 6}" y="${cy + 9}">${esc(tok(ctxMax / 1.12))}</text>`);
      const win = s.peak.window;
      if (win && win < ctxMax) {
        const wy = cy + ch - (win / ctxMax) * ch;
        p.push(`<line x1="${L}" x2="${W - RM}" y1="${wy}" y2="${wy}" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="${W - RM + 6}" y="${wy + 3}" style="fill:var(--bad)">limit</text>`);
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
      d += `L${W - RM} ${(sy + 4).toFixed(1)}`;
      p.push(`<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.6"/>`);
      p.push(`<text x="${W - RM + 6}" y="${sy + 8}" style="fill:var(--accent)">${esc(usd(s.totals.cost))}</text>`);
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
      p.push(`<text x="${L}" y="${H - 6}">event 1</text><text x="${W - RM}" y="${H - 6}" text-anchor="end">event ${n}</text>`);
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
    v.RM = RM;

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
      if (q) { R.stop(); R.select(q.idx, true); }
    });

    v.legend.innerHTML = [...cats].sort().map((c) => `<span><i class="swatch" style="background:${catColor(c)}"></i>${esc(CAT_LABEL[c])}</span>`).join("") +
      `<span><i class="swatch" style="background:var(--accent);transform:rotate(45deg);border-radius:1px"></i>Prompt</span><span><i class="swatch" style="background:var(--c-read);opacity:.5"></i>Context size</span><span><i class="swatch" style="background:var(--accent);height:2px"></i>Cumulative cost</span>`;
    R.updateCursor();
  }

  function preferKind(ev) {
    return ev && (ev.kind === "prompt" || ev.kind === "tool");
  }

  function eventTip(ev) {
    const s = S.session;
    const head = `<b>${esc(KIND_LABEL[ev.kind] || ev.kind)}</b> · ${esc(clock(ev.t))}${ev.sidechain ? " · subagent" : ""}`;
    if (ev.kind === "tool") {
      const t = s.tools[ev.tool];
      return `${head}\n<b>${esc(t.name)}</b> ${esc(R.toolArg(t).slice(0, 120))}${t.ms ? "\n" + esc(dur(t.ms)) : ""}${t.isError ? "\nFailed" : ""}`;
    }
    if (ev.kind === "thinking") return head + (ev.ms ? `\nThought for ${(ev.ms / 1000).toFixed(1)}s` : "");
    return head + "\n" + esc((ev.text || "").slice(0, 220)) + ((ev.text || "").length > 220 ? "…" : "");
  }

  Object.assign(R, { compressTime, drawTimeline, preferKind, eventTip });
})(globalThis.AFD = globalThis.AFD || {});
