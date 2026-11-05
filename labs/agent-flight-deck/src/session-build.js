/* Agent Flight Deck — build an analyzed session (calls, events, tools, turns, files, totals) from grouped log entries. */
(function (AFD) {
  "use strict";

  const P = () => AFD.pricing;
  const { ts, blockText, countLines, classifyUserText, toolCategory, oneLine, num } = AFD.session;

  // ───────────────────────── session build ─────────────────────────

  /**
   * Build an analyzed session from grouped entries.
   * @returns session model (see README in the repo)
   */
  function buildSession(group) {
    const entries = group.entries;
    const calls = [];
    const callById = new Map();
    const events = [];
    const tools = [];
    const toolById = new Map();
    let reportedCost = null;
    let title = "";
    let summary = "";
    const meta = { cwd: "", gitBranch: "", version: "", entrypoint: "" };

    const pushEvent = (ev) => {
      ev.idx = events.length;
      events.push(ev);
      return ev;
    };

    for (const e of entries) {
      const t = ts(e.timestamp);
      if (e.cwd && !meta.cwd) meta.cwd = e.cwd;
      if (e.gitBranch && !meta.gitBranch) meta.gitBranch = e.gitBranch;
      if (e.version) meta.version = e.version;
      if (e.entrypoint && !meta.entrypoint) meta.entrypoint = e.entrypoint;
      const side = !!e.isSidechain;

      switch (e.type) {
        case "assistant": {
          const m = e.message || {};
          const key = m.id || e.requestId || "line:" + e.__file + ":" + e.__line;
          let call = callById.get(key);
          if (!call) {
            call = {
              id: key,
              idx: calls.length,
              t,
              model: m.model || "",
              usage: m.usage || null,
              sidechain: side,
              thinkingMs: 0,
              events: [],
              isError: !!e.isApiErrorMessage || m.model === "<synthetic>",
            };
            callById.set(key, call);
            calls.push(call);
          } else if (m.usage) {
            call.usage = m.usage; // identical across lines, last one wins
          }
          if (e.thinkingDurationMs) call.thinkingMs = Math.max(call.thinkingMs, e.thinkingDurationMs);
          const content = Array.isArray(m.content) ? m.content : m.content ? [{ type: "text", text: String(m.content) }] : [];
          for (const b of content) {
            if (!b) continue;
            if (b.type === "text") {
              const text = (b.text || "").trim();
              if (!text) continue;
              const ev = pushEvent({ t, kind: call.isError ? "error" : "text", text, call: call.idx, sidechain: side });
              call.events.push(ev.idx);
            } else if (b.type === "thinking" || b.type === "redacted_thinking") {
              const ev = pushEvent({ t, kind: "thinking", text: b.thinking || "", call: call.idx, sidechain: side, ms: e.thinkingDurationMs || 0 });
              call.events.push(ev.idx);
            } else if (b.type === "tool_use" || b.type === "server_tool_use") {
              const tool = {
                id: b.id,
                idx: tools.length,
                name: b.name || "tool",
                category: toolCategory(b.name),
                input: b.input || {},
                t,
                endT: 0,
                ms: 0,
                isError: false,
                resultChars: 0,
                result: "",
                call: call.idx,
                sidechain: side,
                event: 0,
              };
              tools.push(tool);
              if (b.id) toolById.set(b.id, tool);
              const ev = pushEvent({ t, kind: "tool", tool: tool.idx, call: call.idx, sidechain: side });
              tool.event = ev.idx;
              call.events.push(ev.idx);
            }
          }
          break;
        }
        case "user": {
          const m = e.message || {};
          const c = m.content;
          if (e.isCompactSummary) {
            pushEvent({ t, kind: "compact", text: "Conversation compacted", detail: blockText(c).slice(0, 2000), sidechain: side });
            break;
          }
          if (Array.isArray(c)) {
            let textParts = [];
            for (const b of c) {
              if (!b) continue;
              if (b.type === "tool_result") {
                const tool = toolById.get(b.tool_use_id);
                const text = blockText(b.content);
                if (tool) {
                  tool.endT = t;
                  tool.ms = tool.t && t ? Math.max(0, t - tool.t) : 0;
                  tool.isError = !!b.is_error;
                  tool.resultChars = text.length;
                  tool.result = text.length > 6000 ? text.slice(0, 6000) + "\n…" : text;
                  tool.extra = e.toolUseResult && typeof e.toolUseResult === "object" ? pickExtra(e.toolUseResult) : null;
                }
              } else if (b.type === "text" && !e.isMeta) {
                textParts.push(b.text || "");
              } else if (b.type === "image" && !e.isMeta) {
                textParts.push("[image]");
              }
            }
            if (textParts.length) addUserText(textParts.join("\n"), t, side);
          } else if (typeof c === "string" && !e.isMeta) {
            addUserText(c, t, side);
          }
          break;
        }
        case "attachment": {
          const a = e.attachment || {};
          if (a.type === "queued_command" && a.prompt && a.commandMode !== "task-notification") {
            // placed where it was delivered; the time it was typed is kept separately
            if (!title) title = a.prompt.trim();
            pushEvent({ t, kind: "prompt", text: a.prompt.trim(), queued: true, queuedAt: ts(a.timestamp) || t, sidechain: side });
          }
          break;
        }
        case "system": {
          if (e.subtype === "compact_boundary") {
            const cm = e.compactMetadata || {};
            pushEvent({ t, kind: "compact", text: "Context compacted" + (cm.trigger ? " (" + cm.trigger + ")" : ""), preTokens: cm.preTokens || 0, sidechain: side });
          } else if (e.level === "error" || e.subtype === "api_error") {
            pushEvent({ t, kind: "error", text: String(e.content || e.error || "API error").slice(0, 500), sidechain: side });
          }
          break;
        }
        case "summary":
          if (e.summary && !summary) summary = e.summary;
          break;
        case "cost-state":
          if (Number.isFinite(e.totalCostUSD)) reportedCost = { usd: e.totalCostUSD, linesAdded: e.totalLinesAdded || 0, linesRemoved: e.totalLinesRemoved || 0, models: e.modelUsage || null, afterEvent: events.length };
          break;
        default:
          break;
      }
    }

    function addUserText(text, t, side) {
      const cls = classifyUserText(text);
      if (!cls) return;
      if (cls.kind === "prompt" && side) {
        pushEvent({ t, kind: "subprompt", text: cls.text, sidechain: true });
        return;
      }
      if (cls.kind === "prompt" && !title) title = cls.text;
      pushEvent({ t, kind: cls.kind, text: cls.text, sidechain: side });
    }

    // ── costs per call
    for (const call of calls) {
      const u = call.usage || {};
      call.input = num(u.input_tokens);
      call.cacheRead = num(u.cache_read_input_tokens);
      call.cacheWrite = num(u.cache_creation_input_tokens);
      call.output = num(u.output_tokens);
      call.thinkingTokens = num(u.output_tokens_details && u.output_tokens_details.thinking_tokens);
      call.ctx = call.input + call.cacheRead + call.cacheWrite;
      call.write1h = num(u.cache_creation && u.cache_creation.ephemeral_1h_input_tokens);
      const spec = P().findModel(call.model);
      call.window = spec ? spec.window : 200000;
      call.cost = call.usage && !call.isError ? P().costOf(u, call.model) : null;
      call.priced = !!call.cost || call.isError || !call.usage;
    }

    // ── turns: a human prompt opens a turn
    const turns = [];
    let cur = null;
    const openTurn = (ev) => {
      cur = { idx: turns.length, t: ev ? ev.t : (events[0] ? events[0].t : 0), prompt: ev ? ev.text : "", startEvent: ev ? ev.idx : 0, events: [], calls: new Set(), tools: [], cost: 0, endT: 0 };
      turns.push(cur);
    };
    for (const ev of events) {
      if ((ev.kind === "prompt" || ev.kind === "command") && !ev.sidechain) openTurn(ev);
      else if (!cur) openTurn(null);
      ev.turn = cur.idx;
      cur.events.push(ev.idx);
      if (ev.call != null) cur.calls.add(ev.call);
      if (ev.kind === "tool") cur.tools.push(ev.tool);
      if (ev.t) cur.endT = Math.max(cur.endT, ev.t);
    }
    for (const call of calls) {
      const firstEv = call.events.length ? events[call.events[0]] : null;
      call.turn = firstEv ? firstEv.turn : turns.length ? turns.length - 1 : 0;
    }
    for (const turn of turns) {
      turn.calls = [...turn.calls];
      turn.cost = turn.calls.reduce((s, ci) => s + (calls[ci].cost ? calls[ci].cost.total : 0), 0);
      for (const ti of turn.tools) if (tools[ti].endT) turn.endT = Math.max(turn.endT, tools[ti].endT);
      turn.ms = turn.endT && turn.t ? turn.endT - turn.t : 0;
    }

    // ── file activity
    const files = new Map();
    const fileOf = (p) => {
      if (!files.has(p)) files.set(p, { path: p, reads: 0, edits: 0, writes: 0, added: 0, removed: 0, tools: [] });
      return files.get(p);
    };
    for (const tool of tools) {
      const inp = tool.input || {};
      const p = inp.file_path || inp.notebook_path || inp.path && (tool.name === "Read") && inp.path;
      if (!p || typeof p !== "string") continue;
      tool.filePath = p;
      const f = fileOf(p);
      f.tools.push(tool.idx);
      if (tool.name === "Read" || tool.name === "NotebookRead") f.reads++;
      else if (tool.name === "Write") {
        f.writes++;
        if (!tool.isError) f.added += countLines(inp.content || "");
      } else if (tool.name === "Edit" || tool.name === "NotebookEdit") {
        f.edits++;
        if (!tool.isError) {
          f.added += countLines(inp.new_string || inp.new_source || "");
          f.removed += countLines(inp.old_string || "");
        }
      } else if (tool.name === "MultiEdit") {
        f.edits++;
        if (!tool.isError) for (const ed of inp.edits || []) {
          f.added += countLines(ed.new_string || "");
          f.removed += countLines(ed.old_string || "");
        }
      }
    }

    // ── totals
    const totals = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, thinking: 0, cost: 0, costParts: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, webSearch: 0 }, unpricedCalls: 0, sideCost: 0, apiCalls: 0 };
    const byModel = new Map();
    let peak = { ctx: 0, call: -1, window: 200000 };
    for (const call of calls) {
      if (call.isError && !call.usage) continue;
      totals.apiCalls++;
      totals.input += call.input;
      totals.cacheRead += call.cacheRead;
      totals.cacheWrite += call.cacheWrite;
      totals.output += call.output;
      totals.thinking += call.thinkingTokens;
      if (call.cost) {
        totals.cost += call.cost.total;
        for (const k of Object.keys(totals.costParts)) totals.costParts[k] += call.cost[k];
        if (call.sidechain) totals.sideCost += call.cost.total;
      } else if (call.usage && !call.isError) totals.unpricedCalls++;
      const mk = call.model || "unknown";
      if (!byModel.has(mk)) byModel.set(mk, { model: mk, name: P().displayName(mk), calls: 0, cost: 0, output: 0 });
      const bm = byModel.get(mk);
      bm.calls++;
      bm.cost += call.cost ? call.cost.total : 0;
      bm.output += call.output;
      if (!call.sidechain && call.ctx > peak.ctx) peak = { ctx: call.ctx, call: call.idx, window: call.window };
    }
    const promptTokens = totals.input + totals.cacheRead + totals.cacheWrite;
    totals.cacheHit = promptTokens ? totals.cacheRead / promptTokens : 0;

    const times = events.map((e) => e.t).concat(tools.map((t) => t.endT)).filter(Boolean);
    const startT = times.length ? Math.min(...times) : 0;
    const endT = times.length ? Math.max(...times) : 0;

    // active time: sum of gaps between consecutive activity points, ignoring gaps over 5 minutes
    const points = [...new Set(times)].sort((a, b) => a - b);
    let activeMs = 0;
    const idleGaps = [];
    for (let i = 1; i < points.length; i++) {
      const g = points[i] - points[i - 1];
      if (g <= IDLE_MS) activeMs += g;
      else idleGaps.push({ from: points[i - 1], to: points[i], ms: g });
    }

    const humanPrompts = events.filter((e) => e.kind === "prompt" && !e.sidechain);
    const session = {
      id: group.id,
      files: group.files,
      badLines: group.bad,
      title: oneLine((title || summary || "Untitled session").replace(/^(\[image\]\s*)+/, "")) || "Untitled session",
      summary,
      meta,
      project: meta.cwd ? meta.cwd.replace(/\/+$/, "").split("/").pop() : "",
      startT,
      endT,
      wallMs: endT - startT,
      activeMs,
      idleGaps,
      calls,
      events,
      tools,
      turns,
      files: [...files.values()].sort((a, b) => b.reads + b.edits * 2 + b.writes * 2 - (a.reads + a.edits * 2 + a.writes * 2)),
      totals,
      byModel: [...byModel.values()].sort((a, b) => b.cost - a.cost),
      peak,
      reportedCost,
      promptCount: humanPrompts.length,
      sourceFiles: group.files,
    };
    session.toolStats = toolStats(tools);
    session.reconcile = reconcile(session);
    session.insights = AFD.insights ? AFD.insights.build(session) : [];
    return session;
  }

  const IDLE_MS = 5 * 60 * 1000;

  function pickExtra(r) {
    const out = {};
    for (const k of ["filePath", "numLines", "totalLines", "numFiles", "durationMs", "interrupted", "returnCodeInterpretation", "truncated"]) {
      if (r[k] !== undefined && (typeof r[k] !== "object")) out[k] = r[k];
    }
    if (r.file && typeof r.file === "object") {
      if (r.file.numLines) out.numLines = r.file.numLines;
      if (r.file.totalLines) out.totalLines = r.file.totalLines;
    }
    return out;
  }

  function toolStats(tools) {
    const m = new Map();
    for (const t of tools) {
      if (!m.has(t.name)) m.set(t.name, { name: t.name, category: t.category, count: 0, errors: 0, ms: 0, resultChars: 0, maxMs: 0 });
      const s = m.get(t.name);
      s.count++;
      if (t.isError) s.errors++;
      s.ms += t.ms;
      s.maxMs = Math.max(s.maxMs, t.ms);
      s.resultChars += t.resultChars;
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }


  /**
   * Compare the estimate with the cost Claude Code logged itself (its last cost-state snapshot),
   * over the same span of the log, per model.
   */
  function reconcile(s) {
    const rc = s.reportedCost;
    if (!rc || !(rc.usd > 0)) return null;
    const upTo = rc.afterEvent != null ? rc.afterEvent : s.events.length;
    const inSpan = s.calls.filter((c) => !c.events.length || c.events[0] < upTo);
    const est = new Map();
    for (const c of inSpan) {
      if (!c.cost) continue;
      const k = P().normalizeModel(c.model);
      const e = est.get(k) || { usd: 0, tokens: 0 };
      e.usd += c.cost.total;
      e.tokens += c.input + c.cacheRead + c.cacheWrite + c.output;
      est.set(k, e);
    }
    const models = [];
    let hidden = 0;
    for (const [model, u] of Object.entries(rc.models || {})) {
      const k = P().normalizeModel(model);
      const e = est.get(k) || { usd: 0, tokens: 0 };
      const logged = num(u.inputTokens) + num(u.outputTokens) + num(u.cacheReadInputTokens) + num(u.cacheCreationInputTokens);
      if (logged > e.tokens) hidden += logged - e.tokens;
      models.push({ model, name: P().displayName(model), loggedUsd: num(u.costUSD), estimateUsd: e.usd, loggedTokens: logged, transcriptTokens: e.tokens });
    }
    const estimateUsd = inSpan.reduce((a, c) => a + (c.cost ? c.cost.total : 0), 0);
    return { loggedUsd: rc.usd, estimateUsd, models, hiddenTokens: hidden, partial: upTo < s.events.length };
  }

  AFD.session.buildSession = buildSession;
  AFD.session.reconcile = reconcile;
})(globalThis.AFD = globalThis.AFD || {});
