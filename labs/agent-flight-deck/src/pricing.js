/* Agent Flight Deck — model pricing and context windows.
 * Prices are USD per million tokens, Anthropic first-party API list prices (cached 2026-10).
 * Cache writes: 1.25x input (5-minute TTL), 2x input (1-hour TTL). Cache reads vary by model.
 */
(function (AFD) {
  "use strict";

  // id prefix -> pricing. Order matters: longer / more specific prefixes first.
  const MODELS = [
    { id: "claude-fable-5-1", name: "Fable 5.1", input: 10, output: 50, cacheRead: 0.25, window: 1000000 },
    { id: "claude-mythos-5-1", name: "Mythos 5.1", input: 10, output: 50, cacheRead: 0.25, window: 1000000 },
    { id: "claude-fable-5", name: "Fable 5", input: 10, output: 50, cacheRead: 1, window: 1000000 },
    { id: "claude-mythos-5", name: "Mythos 5", input: 10, output: 50, cacheRead: 1, window: 1000000 },
    { id: "claude-opus-5-5", name: "Opus 5.5", input: 4, output: 20, cacheRead: 0.2, window: 1000000, fast: 2 },
    { id: "claude-opus-5", name: "Opus 5", input: 5, output: 25, cacheRead: 0.5, window: 1000000, fast: 2 },
    { id: "claude-opus-4-8", name: "Opus 4.8", input: 5, output: 25, cacheRead: 0.5, window: 1000000, fast: 2 },
    { id: "claude-opus-4-7", name: "Opus 4.7", input: 5, output: 25, cacheRead: 0.5, window: 1000000 },
    { id: "claude-opus-4-6", name: "Opus 4.6", input: 5, output: 25, cacheRead: 0.5, window: 1000000 },
    { id: "claude-opus-4-5", name: "Opus 4.5", input: 5, output: 25, cacheRead: 0.5, window: 200000 },
    { id: "claude-opus-4-1", name: "Opus 4.1", input: 15, output: 75, cacheRead: 1.5, window: 200000 },
    { id: "claude-opus-4", name: "Opus 4", input: 15, output: 75, cacheRead: 1.5, window: 200000 },
    { id: "claude-sonnet-5-5", name: "Sonnet 5.5", input: 2, output: 10, cacheRead: 0.2, window: 1000000 },
    { id: "claude-sonnet-5", name: "Sonnet 5", input: 2, output: 10, cacheRead: 0.2, window: 1000000 },
    { id: "claude-sonnet-4-6", name: "Sonnet 4.6", input: 3, output: 15, cacheRead: 0.3, window: 1000000 },
    { id: "claude-sonnet-4-5", name: "Sonnet 4.5", input: 3, output: 15, cacheRead: 0.3, window: 200000 },
    { id: "claude-sonnet-4", name: "Sonnet 4", input: 3, output: 15, cacheRead: 0.3, window: 200000 },
    { id: "claude-3-7-sonnet", name: "Sonnet 3.7", input: 3, output: 15, cacheRead: 0.3, window: 200000 },
    // Haiku 5.5: $0.10/$0.50 up to 100K prompt tokens, $0.50/$2.50 above.
    { id: "claude-haiku-5-5", name: "Haiku 5.5", input: 0.1, output: 0.5, cacheRead: 0.01, window: 1000000,
      longPrompt: { threshold: 100000, input: 0.5, output: 2.5, cacheRead: 0.05 } },
    { id: "claude-haiku-4-5", name: "Haiku 4.5", input: 1, output: 5, cacheRead: 0.1, window: 200000 },
    { id: "claude-3-5-haiku", name: "Haiku 3.5", input: 0.8, output: 4, cacheRead: 0.08, window: 200000 },
  ];

  const WEB_SEARCH_USD = 0.01; // $10 per 1,000 searches

  /** Strip provider prefixes, date suffixes and context suffixes: "us.anthropic.claude-opus-4-1-20250805-v1:0[1m]" -> "claude-opus-4-1" */
  function normalizeModel(raw) {
    if (!raw || typeof raw !== "string") return "";
    let m = raw.trim().toLowerCase();
    m = m.replace(/\[[^\]]*\]$/, "");
    m = m.replace(/^(?:[a-z]{2,4}\.)?anthropic\./, "");
    m = m.replace(/@.*$/, "");
    m = m.replace(/-v\d+(?::\d+)?$/, "");
    m = m.replace(/-\d{8}$/, "");
    return m;
  }

  function findModel(raw) {
    const m = normalizeModel(raw);
    if (!m) return null;
    for (const spec of MODELS) {
      if (m === spec.id || m.startsWith(spec.id + "-")) return spec;
    }
    return null;
  }

  function displayName(raw) {
    const spec = findModel(raw);
    if (spec) return spec.name;
    return raw || "unknown";
  }

  /**
   * Cost of one API response, split by component.
   * usage: Anthropic usage object (input_tokens, output_tokens, cache_read_input_tokens,
   *        cache_creation_input_tokens, cache_creation.{ephemeral_5m_input_tokens, ephemeral_1h_input_tokens}, speed)
   * Returns null when the model is unknown.
   */
  function costOf(usage, rawModel) {
    const spec = findModel(rawModel);
    if (!spec || !usage) return null;
    const input = num(usage.input_tokens);
    const output = num(usage.output_tokens);
    const cacheRead = num(usage.cache_read_input_tokens);
    const cacheWrite = num(usage.cache_creation_input_tokens);
    let write5m = 0;
    let write1h = 0;
    const cc = usage.cache_creation;
    if (cc && (cc.ephemeral_5m_input_tokens != null || cc.ephemeral_1h_input_tokens != null)) {
      write5m = num(cc.ephemeral_5m_input_tokens);
      write1h = num(cc.ephemeral_1h_input_tokens);
      // Any remainder not broken down is treated as a 5-minute write.
      const rest = cacheWrite - write5m - write1h;
      if (rest > 0) write5m += rest;
    } else {
      write5m = cacheWrite;
    }

    let rates = spec;
    const promptTokens = input + cacheRead + cacheWrite;
    if (spec.longPrompt && promptTokens > spec.longPrompt.threshold) rates = Object.assign({}, spec, spec.longPrompt);
    const speedFactor = usage.speed === "fast" && spec.fast ? spec.fast : 1;

    const perTok = (usd) => (usd * speedFactor) / 1e6;
    const parts = {
      input: input * perTok(rates.input),
      cacheWrite: write5m * perTok(rates.input * 1.25) + write1h * perTok(rates.input * 2),
      cacheRead: cacheRead * perTok(rates.cacheRead),
      output: output * perTok(rates.output),
      webSearch: num(usage.server_tool_use && usage.server_tool_use.web_search_requests) * WEB_SEARCH_USD,
    };
    parts.total = parts.input + parts.cacheWrite + parts.cacheRead + parts.output + parts.webSearch;
    return parts;
  }

  /** Cost of sending `tokens` of fresh input once, then re-reading them from cache `reuses` times. */
  function promptCost(tokens, rawModel, opts) {
    const spec = findModel(rawModel);
    if (!spec) return null;
    const o = opts || {};
    const outputTokens = o.outputTokens || 0;
    const first = costOf({ input_tokens: o.cached ? 0 : tokens, cache_creation_input_tokens: o.cached ? tokens : 0, output_tokens: outputTokens }, rawModel);
    const reread = costOf({ cache_read_input_tokens: tokens, output_tokens: outputTokens }, rawModel);
    return { first: first.total, reread: reread.total };
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  AFD.pricing = { MODELS, normalizeModel, findModel, displayName, costOf, promptCost, WEB_SEARCH_USD };
})(globalThis.AFD = globalThis.AFD || {});
