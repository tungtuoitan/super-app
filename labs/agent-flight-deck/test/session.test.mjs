import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const AFD = createRequire(import.meta.url)("./load.cjs");
const { analyzeFiles, classifyUserText } = AFD.session;

const L = (o) => JSON.stringify(Object.assign({ sessionId: "s1", cwd: "/w/proj", timestamp: "2026-01-01T10:00:00.000Z" }, o));
const usage = (o) => Object.assign({ input_tokens: 10, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, o);

test("classifies user text", () => {
  assert.deepEqual(classifyUserText("fix the bug"), { kind: "prompt", text: "fix the bug" });
  assert.equal(classifyUserText("<command-name>/model</command-name><command-args>opus</command-args>").kind, "command");
  assert.equal(classifyUserText("<command-name>/model</command-name><command-args>opus</command-args>").text, "/model opus");
  assert.equal(classifyUserText("<local-command-stdout>ok</local-command-stdout>"), null);
  assert.equal(classifyUserText("<system-reminder>x</system-reminder>"), null);
  assert.equal(classifyUserText("[Request interrupted by user for tool use]").kind, "interrupt");
});

test("dedupes usage across lines that share message.id and pairs tool results", () => {
  const lines = [
    L({ type: "user", message: { role: "user", content: "read the file" } }),
    L({ type: "assistant", timestamp: "2026-01-01T10:00:02.000Z", message: { id: "m1", model: "claude-sonnet-5-5", content: [{ type: "thinking", thinking: "" }], usage: usage({ cache_creation_input_tokens: 5000 }) } }),
    L({ type: "assistant", timestamp: "2026-01-01T10:00:02.000Z", message: { id: "m1", model: "claude-sonnet-5-5", content: [{ type: "tool_use", id: "t1", name: "Read", input: { file_path: "/w/proj/a.ts" } }], usage: usage({ cache_creation_input_tokens: 5000 }) } }),
    L({ type: "user", timestamp: "2026-01-01T10:00:05.000Z", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "hello" }] } }),
    L({ type: "assistant", timestamp: "2026-01-01T10:00:07.000Z", message: { id: "m2", model: "claude-sonnet-5-5", content: [{ type: "text", text: "Done" }], usage: usage({ cache_read_input_tokens: 5000 }) } }),
    "not json",
  ];
  const { sessions, bad } = analyzeFiles([{ name: "s1.jsonl", text: lines.join("\n") }]);
  assert.equal(bad, 1);
  const s = sessions[0];
  assert.equal(s.calls.length, 2);
  assert.equal(s.totals.cacheWrite, 5000);
  assert.equal(s.totals.cacheRead, 5000);
  assert.equal(s.totals.output, 200);
  assert.equal(s.tools.length, 1);
  assert.equal(s.tools[0].ms, 3000);
  assert.equal(s.tools[0].resultChars, 5);
  assert.equal(s.files[0].reads, 1);
  assert.equal(s.turns.length, 1);
  assert.equal(s.title, "read the file");
  assert.equal(s.project, "proj");
  // 5000 5m writes at 1.25 * $2 + 5000 reads at $0.20 + 20 input at $2 + 200 output at $10
  const expected = (5000 * 2.5 + 5000 * 0.1 + 20 * 2 + 200 * 10) / 1e6;
  assert.ok(Math.abs(s.totals.cost - expected) < 1e-12);
});

test("meta lines, slash-command wrappers and queued prompts", () => {
  const lines = [
    L({ type: "user", isMeta: true, message: { role: "user", content: "<local-command-caveat>x</local-command-caveat>" } }),
    L({ type: "user", message: { role: "user", content: "<command-name>/clear</command-name>" } }),
    L({ type: "user", message: { role: "user", content: "first" } }),
    L({ type: "attachment", attachment: { type: "queued_command", prompt: "second, typed mid-turn", timestamp: "2026-01-01T10:01:00.000Z" } }),
  ];
  const s = analyzeFiles([{ name: "x.jsonl", text: lines.join("\n") }]).sessions[0];
  assert.deepEqual(s.events.map((e) => e.kind), ["command", "prompt", "prompt"]);
  assert.equal(s.promptCount, 2);
  assert.equal(s.turns.length, 3);
});

test("subagent files merge into the parent session as sidechain", () => {
  const main = [
    L({ type: "user", message: { role: "user", content: "go" } }),
    L({ type: "assistant", timestamp: "2026-01-01T10:00:01.000Z", message: { id: "a", model: "claude-opus-5-5", content: [{ type: "text", text: "ok" }], usage: usage() } }),
  ].join("\n");
  const sub = [
    L({ type: "assistant", agentId: "x", timestamp: "2026-01-01T10:00:02.000Z", message: { id: "b", model: "claude-haiku-5-5", content: [{ type: "text", text: "sub" }], usage: usage() } }),
  ].join("\n");
  const { sessions } = analyzeFiles([{ name: "proj/s1.jsonl", text: main }, { name: "proj/s1/subagents/agent-x.jsonl", text: sub }]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].calls.length, 2);
  assert.ok(sessions[0].calls[1].sidechain);
  assert.ok(sessions[0].totals.sideCost > 0);
});

test("unknown models are counted as unpriced, synthetic errors are not billed", () => {
  const lines = [
    L({ type: "assistant", message: { id: "a", model: "local-llama", content: [{ type: "text", text: "hi" }], usage: usage() } }),
    L({ type: "assistant", isApiErrorMessage: true, message: { id: "b", model: "<synthetic>", content: [{ type: "text", text: "API Error: 529 overloaded" }], usage: usage({ output_tokens: 0, input_tokens: 0 }) } }),
  ];
  const s = analyzeFiles([{ name: "x.jsonl", text: lines.join("\n") }]).sessions[0];
  assert.equal(s.totals.unpricedCalls, 1);
  assert.equal(s.totals.cost, 0);
  assert.ok(s.events.some((e) => e.kind === "error"));
});

test("the built-in example session parses into the story it tells", () => {
  const s = analyzeFiles([{ name: "example.jsonl", text: AFD.sample.sessionJsonl() }]).sessions[0];
  assert.equal(s.promptCount, 3);
  assert.ok(s.tools.some((t) => t.isError && t.name === "Edit"));
  assert.ok(s.tools.some((t) => t.sidechain));
  const ids = s.insights.map((i) => i.id);
  for (const id of ["cache-rebuild", "model-switch", "tool-errors", "rereads", "subagents"]) assert.ok(ids.includes(id), id);
  assert.ok(s.totals.cost > 0.1 && s.totals.cost < 5);
});

test("empty and garbage input does not throw", () => {
  const r = analyzeFiles([{ name: "e.jsonl", text: "" }, { name: "g.jsonl", text: "{{{\n[1,2]\n42\n" }]);
  assert.equal(r.sessions.length, 0);
});

test("loading subagent files does not move main-transcript lines between turns", () => {
  const T = (s) => `2026-01-01T10:00:${String(s).padStart(2, "0")}.000Z`;
  const main = [
    L({ type: "user", timestamp: T(0), message: { role: "user", content: "first" } }),
    L({ type: "assistant", timestamp: T(10), message: { id: "a1", model: "claude-opus-5-5", content: [{ type: "text", text: "ok" }], usage: usage() } }),
    // a queued prompt written AFTER a later-timestamped line, as Claude Code does
    L({ type: "assistant", timestamp: T(20), message: { id: "a2", model: "claude-opus-5-5", content: [{ type: "text", text: "more" }], usage: usage() } }),
    L({ type: "attachment", timestamp: T(15), attachment: { type: "queued_command", prompt: "second", timestamp: T(15) } }),
    L({ type: "assistant", timestamp: T(25), message: { id: "a3", model: "claude-opus-5-5", content: [{ type: "text", text: "answer" }], usage: usage() } }),
  ].join("\n");
  const sub = L({ type: "assistant", timestamp: T(12), message: { id: "s1", model: "claude-haiku-5-5", content: [{ type: "text", text: "sub" }], usage: usage() } });
  const alone = analyzeFiles([{ name: "p/s1.jsonl", text: main }]).sessions[0];
  const both = analyzeFiles([{ name: "p/s1.jsonl", text: main }, { name: "p/s1/subagents/agent-x.jsonl", text: sub }]).sessions[0];
  const mainCalls = (s) => s.turns.map((t) => t.calls.map((c) => s.calls[c]).filter((c) => !c.sidechain).map((c) => c.id).join(","));
  assert.deepEqual(mainCalls(both), mainCalls(alone));
  assert.equal(both.calls.filter((c) => c.sidechain).length, 1);
});

test("findings: heredoc writes are not 'file dumps'; long pauses and model switches are expected rebuilds", () => {
  const T = (m) => new Date(Date.UTC(2026, 0, 1, 10, m)).toISOString();
  const lines = [L({ type: "user", timestamp: T(0), message: { role: "user", content: "go" } })];
  for (let i = 0; i < 4; i++) {
    lines.push(L({ type: "assistant", timestamp: T(i), message: { id: "b" + i, model: "claude-opus-5-5", content: [{ type: "tool_use", id: "t" + i, name: "Bash", input: { command: "cat > out.txt <<'EOF'\nhi\nEOF" } }], usage: usage({ cache_read_input_tokens: 50000 }) } }));
    lines.push(L({ type: "user", timestamp: T(i), message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t" + i, content: "x".repeat(30000) }] } }));
  }
  // 3-hour pause, then a rebuild: expected, not waste
  lines.push(L({ type: "assistant", timestamp: T(200), message: { id: "late", model: "claude-opus-5-5", content: [{ type: "text", text: "back" }], usage: usage({ cache_creation_input_tokens: 60000 }) } }));
  const s = analyzeFiles([{ name: "x.jsonl", text: lines.join("\n") }]).sessions[0];
  assert.ok(!s.insights.some((i) => i.id === "bash-fileops"), "heredoc writes are not flagged");
  const rb = s.insights.find((i) => i.id === "cache-rebuild");
  assert.ok(rb && rb.level === "info" && /expected/.test(rb.title), rb && rb.title);
});
