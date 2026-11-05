import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const AFD = createRequire(import.meta.url)("./load.cjs");
const { normalizeModel, findModel, costOf } = AFD.pricing;

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("normalizes provider prefixes, dates and context suffixes", () => {
  assert.equal(normalizeModel("claude-sonnet-4-5-20250929"), "claude-sonnet-4-5");
  assert.equal(normalizeModel("us.anthropic.claude-opus-4-1-20250805-v1:0"), "claude-opus-4-1");
  assert.equal(normalizeModel("claude-opus-4-6[1m]"), "claude-opus-4-6");
  assert.equal(normalizeModel("claude-opus-4-5@20251101"), "claude-opus-4-5");
});

test("matches the most specific model", () => {
  assert.equal(findModel("claude-opus-5-5").name, "Opus 5.5");
  assert.equal(findModel("claude-opus-5").name, "Opus 5");
  assert.equal(findModel("claude-opus-4-1-20250805").name, "Opus 4.1");
  assert.equal(findModel("claude-opus-4-20250514").name, "Opus 4");
  assert.equal(findModel("claude-sonnet-5").name, "Sonnet 5");
  assert.equal(findModel("claude-fable-5-1").name, "Fable 5.1");
  assert.equal(findModel("<synthetic>"), null);
  assert.equal(findModel("gpt-5"), null);
});

test("prices each usage component", () => {
  // Sonnet 5.5: $2 in, $10 out, $0.20 cache read; 1h write = 2x input = $4, 5m write = 1.25x = $2.5
  const c = costOf({ input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 2e6,
    cache_creation: { ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 1e6 } }, "claude-sonnet-5-5");
  close(c.input, 2); close(c.output, 10); close(c.cacheRead, 0.2); close(c.cacheWrite, 2.5 + 4); close(c.total, 18.7);
});

test("cache writes without a TTL breakdown count as 5-minute writes", () => {
  const c = costOf({ cache_creation_input_tokens: 1e6 }, "claude-opus-5-5");
  close(c.cacheWrite, 5);
});

test("fast mode doubles Opus 5.5 prices", () => {
  const c = costOf({ input_tokens: 1e6, output_tokens: 1e6, speed: "fast" }, "claude-opus-5-5");
  close(c.total, 8 + 40);
});

test("Haiku 5.5 switches to long-prompt rates above 100K prompt tokens", () => {
  close(costOf({ input_tokens: 50000 }, "claude-haiku-5-5").input, 0.005);
  close(costOf({ input_tokens: 200000 }, "claude-haiku-5-5").input, 0.1);
});

test("web search requests are billed per request", () => {
  close(costOf({ server_tool_use: { web_search_requests: 3 } }, "claude-sonnet-5-5").webSearch, 0.03);
});

test("unknown models return null", () => {
  assert.equal(costOf({ input_tokens: 10 }, "mystery-model"), null);
});
