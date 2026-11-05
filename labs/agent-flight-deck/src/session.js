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

  const isSubagentFile = (name) => /\/subagents\//.test(name || "") || /(^|\/)agent-[\w-]+\.jsonl$/i.test(name || "");

  /**
   * Group entries from many files into sessions (subagent files share the parent's sessionId).
   * The main transcript keeps its own line order: Claude Code writes some lines out of timestamp order
   * (queued prompts are written seconds later), and reordering them would move turn boundaries.
   * Subagent lines are merged in by timestamp around it.
   */
  function groupSessions(fileResults) {
    const groups = new Map();
    for (const fr of fileResults) {
      const fallback = (fr.fileName || "session").replace(/^.*\//, "").replace(/\.jsonl$/i, "");
      const sid = (fr.entries.find((e) => e.sessionId) || {}).sessionId || fallback;
      if (!groups.has(sid)) groups.set(sid, { id: sid, files: [], main: [], side: [], bad: 0 });
      const g = groups.get(sid);
      g.files.push(fr.fileName);
      g.bad += fr.bad;
      const sub = isSubagentFile(fr.fileName);
      for (const e of fr.entries) {
        if (sub && e.isSidechain === undefined) e.isSidechain = true;
        (sub ? g.side : g.main).push(e);
      }
    }
    const out = [];
    for (const g of groups.values()) {
      out.push({ id: g.id, files: g.files, bad: g.bad, entries: g.side.length ? mergeByTime(g.main, g.side) : g.main });
    }
    return out;
  }

  /** Merge `side` (sorted by time) into `main` without changing main's order. */
  function mergeByTime(main, side) {
    const sorted = side.map((e, i) => ({ e, t: ts(e.timestamp), i })).sort((a, b) => a.t - b.t || a.i - b.i);
    const out = [];
    let j = 0;
    let lastT = 0;
    for (const e of main) {
      const t = ts(e.timestamp) || lastT;
      while (j < sorted.length && sorted[j].t && sorted[j].t < t) out.push(sorted[j++].e);
      out.push(e);
      lastT = t;
    }
    while (j < sorted.length) out.push(sorted[j++].e);
    return out;
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
    const sessions = groups.map((g) => AFD.session.buildSession(g)).filter((s) => s.calls.length || s.events.length);
    sessions.sort((a, b) => b.startT - a.startT);
    const bad = results.reduce((a, r) => a + r.bad, 0);
    const empty = results.filter((r) => !r.entries.length).map((r) => r.fileName);
    return { sessions, bad, empty };
  }

  AFD.session = Object.assign(AFD.session || {}, { parseLines, groupSessions, mergeByTime, analyzeFiles, classifyUserText, toolCategory, fmtDur, shortPath, blockText, ts, countLines, oneLine, num });
})(globalThis.AFD = globalThis.AFD || {});

