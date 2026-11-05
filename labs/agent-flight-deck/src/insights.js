/* Agent Flight Deck — findings: what a session log says about cost and efficiency.
 * Pure functions over a built session (see session-build.js). Each finding names its evidence (refs = event indexes).
 */
(function (AFD) {
  "use strict";

  const P = () => AFD.pricing;
  const HOUR = 60 * 60 * 1000;
  const FIVE_MIN = 5 * 60 * 1000;

  const fmtUSD = (v) => "$" + (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(3));
  const tok = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n)));
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");

  function groupCount(arr) {
    const m = new Map();
    for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }
  /** The event a finding should jump to: the call's first reply or tool use (thinking rows are often hidden). */
  function firstEventOfCall(s, callIdx) {
    const c = s.calls[callIdx];
    if (!c || !c.events.length) return null;
    const shown = c.events.find((i) => s.events[i].kind !== "thinking");
    return shown != null ? shown : c.events[0];
  }

  /**
   * Why a call re-wrote most of its context to the cache, and whether that could have been avoided.
   * avoidable: a pause between the 5-minute TTL and an hour (a keep-alive or the 1-hour cache would have kept it),
   *            or an early part of the context changed (CLAUDE.md, tools, an edited earlier turn).
   * expected:  a pause over an hour, a model switch the user chose, a compaction, the first call.
   */
  function classifyRebuild(s, c, prev) {
    const gap = c.t && prev.t ? c.t - prev.t : 0;
    const ttl = c.write1h > 0 || prev.write1h > 0 ? HOUR : FIVE_MIN;
    if (P().normalizeModel(c.model) !== P().normalizeModel(prev.model)) return { avoidable: false, reason: `the model switched to ${P().displayName(c.model)}` };
    if (s.events.some((e) => e.kind === "compact" && e.t <= c.t && e.t >= prev.t)) return { avoidable: false, reason: "the context was compacted" };
    if (gap > ttl) {
      if (gap > HOUR) return { avoidable: false, reason: "a pause of over an hour" };
      return { avoidable: true, reason: `a ${AFD.session.fmtDur(gap)} pause outlived the 5-minute cache` };
    }
    return { avoidable: true, reason: "something early in the context changed (CLAUDE.md, the tool list, or an edited earlier turn)" };
  }

  function build(s) {
    const out = [];
    const main = s.calls.filter((c) => !c.sidechain && c.usage && !c.isError);
    const fmtDur = AFD.session.fmtDur;
    const shortPath = AFD.session.shortPath;

    // 1. Cache efficiency
    if (main.length >= 3) {
      const hit = s.totals.cacheHit;
      if (hit >= 0.8) out.push({ level: "good", id: "cache-hit", title: `Prompt cache hit rate is ${(hit * 100).toFixed(0)}%`, detail: `Most of the ${tok(s.totals.input + s.totals.cacheRead + s.totals.cacheWrite)} prompt tokens were served from cache, which is billed at a fraction of the input price.` });
      else if (hit < 0.5) out.push({ level: "warn", id: "cache-hit", title: `Prompt cache hit rate is only ${(hit * 100).toFixed(0)}%`, detail: "Most prompt tokens were billed at full or cache-write price. Pauses of 5 to 60 minutes, model switches and changes to early context all force the cache to rebuild." });
    }

    // 2. Cache rebuilds: big writes after the first call, split into avoidable and expected
    const rebuilds = [];
    for (let i = 1; i < main.length; i++) {
      const c = main[i];
      const prev = main[i - 1];
      if (c.cacheWrite < 20000 || c.cacheWrite < c.ctx * 0.5) continue;
      const why = classifyRebuild(s, c, prev);
      // what this write cost beyond reading the same tokens from cache (same model, speed and price tier)
      const asRead = P().costOf({ cache_read_input_tokens: c.cacheWrite, speed: c.usage.speed }, c.model);
      const extra = c.cost && asRead ? Math.max(0, c.cost.cacheWrite - asRead.cacheRead) : 0;
      rebuilds.push(Object.assign({ call: c.idx, tokens: c.cacheWrite, extra }, why));
    }
    const avoidable = rebuilds.filter((r) => r.avoidable);
    const expected = rebuilds.filter((r) => !r.avoidable);
    const reasonList = (list) => groupCount(list.map((r) => r.reason.replace(/a [\dhms ]+ pause outlived/, "a pause outlived"))).map(([r, n]) => (n > 1 ? `${r} (${n}×)` : r)).join("; ");
    if (avoidable.length) {
      const extra = avoidable.reduce((a, r) => a + r.extra, 0);
      out.push({
        level: extra > 0.25 || avoidable.length >= 3 ? "warn" : "info",
        id: "cache-rebuild",
        title: `${plural(avoidable.length, "avoidable cache rebuild")} (about ${fmtUSD(extra)} extra)`,
        detail: `Caused by ${reasonList(avoidable)}. Each rebuild re-sends the whole context at cache-write price instead of the cache-read price. For pauses under an hour, the 1-hour cache keeps it warm.` + (expected.length ? ` ${plural(expected.length, "other rebuild")} had expected causes: ${reasonList(expected)}.` : ""),
        impact: extra,
        refs: avoidable.map((r) => firstEventOfCall(s, r.call)).filter((x) => x != null),
      });
    } else if (expected.length) {
      out.push({ level: "info", id: "cache-rebuild", title: `The cache was rebuilt ${plural(expected.length, "time")}, for expected reasons`, detail: `Caused by ${reasonList(expected)}. Nothing to change here.`, refs: expected.map((r) => firstEventOfCall(s, r.call)).filter((x) => x != null) });
    }

    // 3. Model switches
    let switches = 0;
    for (let i = 1; i < main.length; i++) if (P().normalizeModel(main[i].model) !== P().normalizeModel(main[i - 1].model)) switches++;
    if (switches) out.push({ level: "info", id: "model-switch", title: `Model changed ${plural(switches, "time")}`, detail: "Models used: " + s.byModel.map((m) => `${m.name} (${m.calls} calls, ${fmtUSD(m.cost)})`).join(", ") + ". Caches are per model, so each switch starts a fresh cache." });

    // 4. Tool errors
    const errTools = s.tools.filter((t) => t.isError);
    if (s.tools.length >= 5) {
      const rate = errTools.length / s.tools.length;
      if (!errTools.length) out.push({ level: "good", id: "tool-errors", title: `All ${s.tools.length} tool calls succeeded`, detail: "No tool returned an error." });
      else {
        const top = groupCount(errTools.map((t) => t.name)).slice(0, 3).map(([n, c]) => `${n} ×${c}`).join(", ");
        out.push({ level: rate > 0.1 ? "warn" : "info", id: "tool-errors", title: `${errTools.length} of ${s.tools.length} tool calls failed (${(rate * 100).toFixed(0)}%)`, detail: `Failing tools: ${top}. Each failure costs a round trip and usually a retry.`, refs: errTools.slice(0, 20).map((t) => t.event) });
      }
    }

    // 5. Rejected edits
    const editMiss = s.tools.filter((t) => t.isError && /^(Edit|MultiEdit|Write)$/.test(t.name));
    if (editMiss.length >= 2) out.push({ level: "warn", id: "edit-miss", title: `${editMiss.length} edits were rejected`, detail: "Usually the old text did not match exactly or the file changed since it was read. Re-reading the exact region before editing avoids the retry loop.", refs: editMiss.map((t) => t.event) });

    // 6. Repeated reads
    const reread = s.files.filter((f) => f.reads >= 3);
    if (reread.length) out.push({ level: "info", id: "rereads", title: `${plural(reread.length, "file was", "files were")} read 3+ times`, detail: reread.slice(0, 4).map((f) => `${shortPath(f.path)} (${f.reads}×)`).join(", ") + ". Repeated reads re-add the same text to context.", refs: reread.slice(0, 3).flatMap((f) => f.tools.map((ti) => s.tools[ti].event)).slice(0, 20) });

    // 7. Bash used to dump files: only plain reads (no redirects, heredocs or pipes) whose output was actually large
    const dumps = s.tools.filter((t) => {
      if (t.name !== "Bash") return false;
      const cmd = String((t.input || {}).command || "");
      if (/<<|>\s*[^&\s/]|\|/.test(cmd.replace(/2>\s*\/dev\/null/g, ""))) return false;
      return /^\s*(cat|head|tail|grep|rg|find|ls|sed -n|awk|less|more)\b/.test(cmd) && t.resultChars > 8000;
    });
    const dumpChars = dumps.reduce((a, t) => a + t.resultChars, 0);
    if (dumps.length && dumpChars > 20000) out.push({ level: "info", id: "bash-fileops", title: `Bash dumped ~${tok(AFD.pricing.charsToTokens(dumpChars))} tokens of file output`, detail: `${plural(dumps.length, "cat/grep/find command")} returned large output. The Read, Grep and Glob tools page and cap results, so less of it lands in context.`, refs: dumps.slice(0, 20).map((t) => t.event) });

    // 8. Large tool results
    const big = s.tools.filter((t) => t.resultChars > 40000).sort((a, b) => b.resultChars - a.resultChars);
    if (big.length) out.push({ level: "warn", id: "big-results", title: `${plural(big.length, "tool result")} over ~13K tokens`, detail: big.slice(0, 3).map((t) => `${t.name}${t.filePath ? " " + shortPath(t.filePath) : ""}: ~${tok(AFD.pricing.charsToTokens(t.resultChars))} tokens`).join("; ") + ". Large results stay in context for every following call.", refs: big.slice(0, 10).map((t) => t.event) });

    // 9. Context pressure
    if (s.peak.ctx > 0) {
      const ratio = s.peak.ctx / s.peak.window;
      const ref = [firstEventOfCall(s, s.peak.call)].filter((x) => x != null);
      if (ratio > 0.6) out.push({ level: "warn", id: "context-peak", title: `Context peaked at ${(ratio * 100).toFixed(0)}% of the window`, detail: `${tok(s.peak.ctx)} of ${tok(s.peak.window)} tokens. Near the limit Claude Code compacts the conversation and older detail is summarized.`, refs: ref });
      else if (main.length >= 5) out.push({ level: "good", id: "context-peak", title: `Context peaked at ${tok(s.peak.ctx)} tokens`, detail: `${(ratio * 100).toFixed(0)}% of the ${tok(s.peak.window)} window, plenty of headroom.`, refs: ref });
    }

    // 10. Slow tools (subagents are slow by design, so they are left out)
    const slow = s.tools.filter((t) => t.ms > 120000 && t.category !== "agent").sort((a, b) => b.ms - a.ms);
    if (slow.length) out.push({ level: "info", id: "slow-tools", title: `${plural(slow.length, "tool call")} took over 2 minutes`, detail: slow.slice(0, 3).map((t) => `${t.name} ${fmtDur(t.ms)}`).join(", ") + ". The time includes waiting for permission prompts as well as slow commands.", refs: slow.slice(0, 10).map((t) => t.event) });

    // 11. Subagents
    if (s.totals.sideCost > 0 && s.totals.cost > 0) {
      const share = s.totals.sideCost / s.totals.cost;
      out.push({ level: "info", id: "subagents", title: `Subagents used ${(share * 100).toFixed(0)}% of the spend`, detail: `${fmtUSD(s.totals.sideCost)} of ${fmtUSD(s.totals.cost)} went to subagent calls, which keep their file reading out of the main context.` });
    }

    // 12. Output share
    if (s.totals.cost > 0.05) {
      const outShare = s.totals.costParts.output / s.totals.cost;
      const think = s.totals.thinking && s.totals.output ? s.totals.thinking / s.totals.output : 0;
      if (outShare > 0.5) out.push({ level: "info", id: "output-share", title: `Output tokens are ${(outShare * 100).toFixed(0)}% of the cost`, detail: `Claude generated ${tok(s.totals.output)} tokens${think ? `, ${(think * 100).toFixed(0)}% of them thinking` : ""}. A lower effort setting trims thinking on routine work.` });
    }

    // 13. Idle
    if (s.idleGaps.length && s.wallMs > 0) {
      const idle = s.idleGaps.reduce((a, g) => a + g.ms, 0);
      if (idle / s.wallMs > 0.5) out.push({ level: "info", id: "idle", title: `Active ${fmtDur(s.activeMs)} out of ${fmtDur(s.wallMs)} wall time`, detail: `${plural(s.idleGaps.length, "pause")} over 5 minutes. The timeline shortens them so the work is easier to follow.` });
    }

    // 14. Reconciliation with the cost Claude Code logged
    const rec = s.reconcile;
    if (rec && rec.loggedUsd > 0) {
      const diff = rec.estimateUsd - rec.loggedUsd;
      const rel = Math.abs(diff) / rec.loggedUsd;
      if (rel > 0.05) out.push({ level: "info", id: "reconcile", title: `Estimate differs from Claude Code's own total by ${fmtUSD(Math.abs(diff))}`, detail: `Claude Code logged ${fmtUSD(rec.loggedUsd)} up to its last cost snapshot; the calls in this log price to ${fmtUSD(rec.estimateUsd)} over the same span. ${rec.hiddenTokens > 0 ? `Claude Code also counted about ${tok(rec.hiddenTokens)} tokens from calls that are not in the transcript (titles, summaries and other background requests).` : ""}` });
    }

    const order = { warn: 0, info: 1, good: 2 };
    out.sort((a, b) => order[a.level] - order[b.level] || (b.impact || 0) - (a.impact || 0));
    return out;
  }

  AFD.insights = { build, classifyRebuild };
})(globalThis.AFD = globalThis.AFD || {});
