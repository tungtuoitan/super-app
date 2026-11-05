/* Agent Flight Deck — Claude Code transcript (.jsonl) parser and analysis.
 * Pure functions: no DOM. Works in the browser and in Node (tests).
 *
 * Transcript facts this relies on (checked against real Claude Code logs):
 *  - one JSON object per line; `type` is user | assistant | system | attachment | summary | cost-state | ...
 *  - one API response is split over several `assistant` lines that share `message.id` and repeat the same `usage`
 *  - tool results come back as `user` lines whose content holds `tool_result` blocks (tool_use_id, is_error)
 *  - human prompts are `user` lines with string/text content and no `isMeta`; slash commands are wrapped in <command-name>
 *  - prompts typed while Claude works arrive as `attachment` lines of type `queued_command`
 */
(function (AFD) {
  "use strict";

  const P = () => AFD.pricing;

  const TOOL_CATEGORY = {
    Read: "read", Glob: "read", Grep: "read", LS: "read", NotebookRead: "read",
    Edit: "edit", Write: "edit", MultiEdit: "edit", NotebookEdit: "edit",
    Bash: "run", BashOutput: "run", KillShell: "run", KillBash: "run", Monitor: "run",
    WebFetch: "web", WebSearch: "web",
    Task: "agent", Agent: "agent", Workflow: "agent", SendMessage: "agent",
  };

  function toolCategory(name) {
    if (!name) return "other";
    if (TOOL_CATEGORY[name]) return TOOL_CATEGORY[name];
    if (name.startsWith("mcp__")) return "mcp";
    return "other";
  }

  // ───────────────────────── line parsing ─────────────────────────

  /** Parse JSONL text into entries. Bad lines are counted, not fatal. */
  function parseLines(text, fileName) {
    const entries = [];
    let bad = 0;
    let lineNo = 0;
    let start = 0;
    const len = text.length;
    while (start < len) {
      let end = text.indexOf("\n", start);
      if (end === -1) end = len;
      const line = text.slice(start, end).trim();
      start = end + 1;
      lineNo++;
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj === "object") {
          obj.__line = lineNo;
          obj.__file = fileName || "";
          entries.push(obj);
        }
      } catch (e) {
        bad++;
      }
    }
    return { entries, bad };
  }

  /** Group entries from many files into sessions (subagent files share the parent's sessionId). */
  function groupSessions(fileResults) {
    const groups = new Map();
    for (const fr of fileResults) {
      let fallback = (fr.fileName || "session").replace(/^.*\//, "").replace(/\.jsonl$/i, "");
      const sid = (fr.entries.find((e) => e.sessionId) || {}).sessionId || fallback;
      if (!groups.has(sid)) groups.set(sid, { id: sid, files: [], entries: [], bad: 0 });
      const g = groups.get(sid);
      g.files.push(fr.fileName);
      g.bad += fr.bad;
      const isSubFile = /\/subagents\//.test(fr.fileName || "") || /agent-[\w-]+\.jsonl$/i.test(fr.fileName || "");
      for (const e of fr.entries) {
        if (isSubFile && e.isSidechain === undefined) e.isSidechain = true;
        g.entries.push(e);
      }
    }
    for (const g of groups.values()) {
      if (g.files.length > 1) stableSortByTime(g.entries);
    }
    return [...groups.values()];
  }

  function stableSortByTime(entries) {
    let last = 0;
    const keyed = entries.map((e, i) => {
      const t = ts(e.timestamp);
      if (t) last = t;
      return { e, t: t || last, i };
    });
    keyed.sort((a, b) => a.t - b.t || a.i - b.i);
    for (let i = 0; i < keyed.length; i++) entries[i] = keyed[i].e;
  }

  function ts(v) {
    if (!v) return 0;
    if (typeof v === "number") return v;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }

  // ───────────────────────── text helpers ─────────────────────────

  function blockText(content) {
    if (content == null) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((b) => (typeof b === "string" ? b : b && b.type === "text" ? b.text || "" : b && b.type === "image" ? "[image]" : ""))
        .join("\n");
    }
    if (typeof content === "object" && content.text) return String(content.text);
    return "";
  }

  function countLines(s) {
    if (!s) return 0;
    let n = 1;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
    return n;
  }

  /** Classify a user-typed string: a real prompt, a slash command, or harness noise. */
  function classifyUserText(text) {
    const t = (text || "").trim();
    if (!t) return null;
    const cmd = t.match(/<command-name>\s*([^<]+?)\s*<\/command-name>/);
    if (cmd) {
      const args = t.match(/<command-args>([\s\S]*?)<\/command-args>/);
      return { kind: "command", text: (cmd[1] + " " + (args ? args[1].trim() : "")).trim() };
    }
    if (/^<(local-command-|system-reminder|bash-stdout|bash-stderr|command-message|task-notification|user-memory-input)/.test(t)) return null;
    if (/^\[Request interrupted by user/.test(t)) return { kind: "interrupt", text: "Interrupted by user" };
    if (/^<bash-input>/.test(t)) return { kind: "command", text: "! " + t.replace(/<\/?bash-input>/g, "").trim() };
    if (/^Caveat: The messages below were generated/.test(t)) return null;
    return { kind: "prompt", text: t };
  }

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
            const qt = ts(a.timestamp) || t;
            if (!title) title = a.prompt.trim();
            pushEvent({ t: qt, kind: "prompt", text: a.prompt.trim(), queued: true, sidechain: side });
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
    session.insights = buildInsights(session);
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

  // ───────────────────────── insights ─────────────────────────

  function buildInsights(s) {
    const out = [];
    const fmtUSD = (v) => "$" + (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(3));
    const main = s.calls.filter((c) => !c.sidechain && c.usage && !c.isError);
    const tok = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n)));

    // 1. Cache efficiency
    if (main.length >= 3) {
      const hit = s.totals.cacheHit;
      if (hit >= 0.8) out.push({ level: "good", id: "cache-hit", title: `Prompt cache hit rate is ${(hit * 100).toFixed(0)}%`, detail: `Most of the ${tok(s.totals.input + s.totals.cacheRead + s.totals.cacheWrite)} prompt tokens were served from cache, which is billed at a fraction of the input price.` });
      else if (hit < 0.5) out.push({ level: "warn", id: "cache-hit", title: `Prompt cache hit rate is only ${(hit * 100).toFixed(0)}%`, detail: "Most prompt tokens were billed at full or cache-write price. Long pauses, model switches and edits to early context all force the cache to rebuild." });
    }

    // 2. Cache rebuilds: big writes after the first call, with a reason
    const rebuilds = [];
    for (let i = 1; i < main.length; i++) {
      const c = main[i];
      const prev = main[i - 1];
      if (c.cacheWrite < 20000 || c.cacheWrite < c.ctx * 0.5) continue;
      const gap = c.t && prev.t ? c.t - prev.t : 0;
      const ttl = c.write1h > 0 || prev.write1h > 0 ? 60 * 60 * 1000 : 5 * 60 * 1000;
      let reason = "the cached prefix changed";
      if (P().normalizeModel(c.model) !== P().normalizeModel(prev.model)) reason = `the model switched to ${P().displayName(c.model)}`;
      else if (gap > ttl) reason = `a ${fmtDur(gap)} pause outlived the ${ttl > 5 * 60 * 1000 ? "1-hour" : "5-minute"} cache`;
      else if (s.events.some((e) => e.kind === "compact" && e.t <= c.t && e.t >= prev.t)) reason = "the context was compacted";
      const spec = P().findModel(c.model);
      // what this write cost beyond a cache read of the same tokens
      const extra = spec ? (c.cost ? c.cost.cacheWrite : 0) - (c.cacheWrite * spec.cacheRead) / 1e6 : 0;
      rebuilds.push({ call: c.idx, reason, tokens: c.cacheWrite, extra });
    }
    if (rebuilds.length) {
      const extra = rebuilds.reduce((a, r) => a + r.extra, 0);
      const reasons = groupCount(rebuilds.map((r) => r.reason.replace(/a [\dhms ]+ pause/, "a long pause")));
      out.push({
        level: extra > 0.5 || rebuilds.length >= 3 ? "warn" : "info",
        id: "cache-rebuild",
        title: `The cache was rebuilt ${rebuilds.length} time${rebuilds.length > 1 ? "s" : ""} mid-session (about ${fmtUSD(extra)} extra)`,
        detail: "Rebuilds happened because " + reasons.map(([r, n]) => (n > 1 ? `${r} (${n}×)` : r)).join("; ") + ". Each rebuild re-sends the whole context at cache-write price instead of the cheap cache-read price.",
        impact: extra,
        refs: rebuilds.map((r) => firstEventOfCall(s, r.call)).filter((x) => x != null),
      });
    }

    // 3. Model switches
    let switches = 0;
    for (let i = 1; i < main.length; i++) if (P().normalizeModel(main[i].model) !== P().normalizeModel(main[i - 1].model)) switches++;
    if (switches) out.push({ level: "info", id: "model-switch", title: `Model changed ${switches} time${switches > 1 ? "s" : ""}`, detail: "Models used: " + s.byModel.map((m) => `${m.name} (${m.calls} calls, ${fmtUSD(m.cost)})`).join(", ") + ". Caches are per model, so every switch starts a fresh cache." });

    // 4. Tool errors
    const errTools = s.tools.filter((t) => t.isError);
    if (s.tools.length >= 5) {
      const rate = errTools.length / s.tools.length;
      if (errTools.length === 0) out.push({ level: "good", id: "tool-errors", title: `All ${s.tools.length} tool calls succeeded`, detail: "No tool returned an error." });
      else {
        const top = groupCount(errTools.map((t) => t.name)).slice(0, 3).map(([n, c]) => `${n} ×${c}`).join(", ");
        out.push({ level: rate > 0.1 ? "warn" : "info", id: "tool-errors", title: `${errTools.length} of ${s.tools.length} tool calls failed (${(rate * 100).toFixed(0)}%)`, detail: `Failing tools: ${top}. Each failure costs a round trip and usually a retry.`, refs: errTools.slice(0, 20).map((t) => t.event) });
      }
    }

    // 5. Edits that failed because the target text was not found / file not read
    const editMiss = s.tools.filter((t) => t.isError && /^(Edit|MultiEdit|Write)$/.test(t.name));
    if (editMiss.length >= 2) out.push({ level: "warn", id: "edit-miss", title: `${editMiss.length} edits were rejected`, detail: "Usually the old text did not match exactly or the file changed since it was read. Re-reading the exact region before editing avoids the retry loop.", refs: editMiss.map((t) => t.event) });

    // 6. Repeated reads
    const reread = s.files.filter((f) => f.reads >= 3);
    if (reread.length) out.push({ level: "info", id: "rereads", title: `${reread.length} file${reread.length > 1 ? "s were" : " was"} read 3+ times`, detail: reread.slice(0, 4).map((f) => `${shortPath(f.path)} (${f.reads}×)`).join(", ") + ". Repeated reads re-add the same text to context.", refs: reread.slice(0, 3).flatMap((f) => f.tools.map((ti) => s.tools[ti].event)).slice(0, 20) });

    // 7. Bash used for file operations
    const bashFileOps = s.tools.filter((t) => t.name === "Bash" && /^\s*(cat|head|tail|grep|rg|find|ls|sed -n|awk)\b/.test(String((t.input || {}).command || "")));
    if (bashFileOps.length >= 3) out.push({ level: "info", id: "bash-fileops", title: `Bash ran ${bashFileOps.length} file-reading commands`, detail: "Commands like cat, grep and find through Bash return unbounded output. The dedicated Read, Grep and Glob tools page and cap results.", refs: bashFileOps.slice(0, 20).map((t) => t.event) });

    // 8. Large tool results
    const big = s.tools.filter((t) => t.resultChars > 40000).sort((a, b) => b.resultChars - a.resultChars);
    if (big.length) out.push({ level: "warn", id: "big-results", title: `${big.length} tool result${big.length > 1 ? "s" : ""} over ~10K tokens`, detail: big.slice(0, 3).map((t) => `${t.name}${t.filePath ? " " + shortPath(t.filePath) : ""}: ~${tok(t.resultChars / 3.5)} tokens`).join("; ") + ". Large results stay in context for every following call.", refs: big.slice(0, 10).map((t) => t.event) });

    // 9. Context pressure
    if (s.peak.ctx > 0) {
      const ratio = s.peak.ctx / s.peak.window;
      if (ratio > 0.6) out.push({ level: "warn", id: "context-peak", title: `Context peaked at ${(ratio * 100).toFixed(0)}% of the window`, detail: `${tok(s.peak.ctx)} of ${tok(s.peak.window)} tokens. Near the limit Claude Code compacts the conversation and older detail is summarized.`, refs: [firstEventOfCall(s, s.peak.call)].filter((x) => x != null) });
      else if (main.length >= 5) out.push({ level: "good", id: "context-peak", title: `Context peaked at ${tok(s.peak.ctx)} tokens`, detail: `${(ratio * 100).toFixed(0)}% of the ${tok(s.peak.window)} window, plenty of headroom.`, refs: [firstEventOfCall(s, s.peak.call)].filter((x) => x != null) });
    }

    // 10. Slow tools
    const slow = s.tools.filter((t) => t.ms > 120000).sort((a, b) => b.ms - a.ms);
    if (slow.length) out.push({ level: "info", id: "slow-tools", title: `${slow.length} tool call${slow.length > 1 ? "s" : ""} took over 2 minutes`, detail: slow.slice(0, 3).map((t) => `${t.name} ${fmtDur(t.ms)}`).join(", ") + ". Long waits include permission prompts and slow commands.", refs: slow.slice(0, 10).map((t) => t.event) });

    // 11. Subagents
    if (s.totals.sideCost > 0 && s.totals.cost > 0) {
      const share = s.totals.sideCost / s.totals.cost;
      out.push({ level: "info", id: "subagents", title: `Subagents used ${(share * 100).toFixed(0)}% of the spend`, detail: `${fmtUSD(s.totals.sideCost)} of ${fmtUSD(s.totals.cost)} went to sidechain (subagent) calls, which keep their file reading out of the main context.` });
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
      if (idle / s.wallMs > 0.5) out.push({ level: "info", id: "idle", title: `Active ${fmtDur(s.activeMs)} out of ${fmtDur(s.wallMs)} wall time`, detail: `${s.idleGaps.length} pause${s.idleGaps.length > 1 ? "s" : ""} over 5 minutes. The timeline collapses them so the work is easier to follow.` });
    }

    const order = { warn: 0, info: 1, good: 2 };
    out.sort((a, b) => order[a.level] - order[b.level] || (b.impact || 0) - (a.impact || 0));
    return out;
  }

  function firstEventOfCall(s, callIdx) {
    const c = s.calls[callIdx];
    return c && c.events.length ? c.events[0] : null;
  }

  function groupCount(arr) {
    const m = new Map();
    for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  function shortPath(p) {
    const parts = String(p).split("/").filter(Boolean);
    return parts.length > 2 ? "…/" + parts.slice(-2).join("/") : p;
  }

  function oneLine(s) {
    return String(s).replace(/\s+/g, " ").trim().slice(0, 200);
  }

  function fmtDur(ms) {
    if (!ms || ms < 0) return "0s";
    const s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m " + String(s % 60).padStart(2, "0") + "s";
    const h = Math.floor(m / 60);
    if (h < 48) return h + "h " + String(m % 60).padStart(2, "0") + "m";
    return Math.floor(h / 24) + "d " + (h % 24) + "h";
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /** Convenience: parse one or many {name, text} files into analyzed sessions, newest first. */
  function analyzeFiles(files) {
    const results = files.map((f) => Object.assign({ fileName: f.name }, parseLines(f.text, f.name)));
    const groups = groupSessions(results.filter((r) => r.entries.length));
    const sessions = groups.map(buildSession).filter((s) => s.calls.length || s.events.length);
    sessions.sort((a, b) => b.startT - a.startT);
    const bad = results.reduce((a, r) => a + r.bad, 0);
    const empty = results.filter((r) => !r.entries.length).map((r) => r.fileName);
    return { sessions, bad, empty };
  }

  AFD.session = { parseLines, groupSessions, buildSession, analyzeFiles, classifyUserText, toolCategory, fmtDur, shortPath, blockText };
})(globalThis.AFD = globalThis.AFD || {});
