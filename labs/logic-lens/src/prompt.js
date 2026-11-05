/* Logic Lens — the instruction sent to Claude (plain code, or a code change), and reading a pasted reply back into a flow. */
(function (LL) {
  "use strict";

  const { normalize, parseText, guessLanguage, numberLines } = LL.flow;

  const SIZE = {
    simple: { total: 10, top: "4 to 7", depth: 1, extra: "Only show the main path and the main split; fold everything else into the boxes." },
    normal: { total: 18, top: "5 to 10", depth: 2, extra: "Show the real branches, loops and phases; fold small checks into the box they belong to." },
    detailed: { total: 28, top: "6 to 12", depth: 2, extra: "Include every meaningful check, branch and call, still within the limits." },
  };

  // Worked examples, one per output language (Claude mirrors the example's wording). Content is invented.
  const EXAMPLE = {
    en: {
      title: "Import orders from CSV",
      summary: "Reads a supplier CSV, collects bad rows instead of stopping, gives up above 10% bad rows, then saves new and changed orders in one transaction.",
      steps: [
        { kind: "start", title: "importOrders(path)", sub: "called by the nightly job", lines: [1, 2] },
        { kind: "loop", title: "For each CSV row", sub: "numbered from line 2", tag: "FILE", lines: [4, 14], steps: [
          { kind: "step", title: "Parse the row", sub: "price as Decimal, SKU upper-cased", lines: [5, 9] },
          { kind: "step", title: "Bad row: note it", sub: "the import goes on", attention: true, lines: [10, 13], detail: "Missing columns or a malformed price only add the row to the error list." },
        ] },
        { kind: "step", title: "Check the error rate", sub: "more than 10% bad rows?", lines: [16, 16] },
        { kind: "branch", lanes: [
          { title: "Over 10%", lines: [16, 17], steps: [{ kind: "end", exit: "throw", title: "ImportAborted", sub: "nothing is written", lines: [17, 17] }] },
          { title: "Within the limit", sub: "bad rows are skipped", lines: [19, 19], steps: [] },
        ] },
        { kind: "call", title: "diffWithDatabase()", sub: "new vs changed orders", tag: "DB", lines: [19, 26] },
        { kind: "parallel", lanes: [
          { title: "Save orders", sub: "one transaction", tag: "DB", lines: [28, 30], steps: [] },
          { title: "Notify sales", tag: "EMAIL", lines: [31, 31], steps: [] },
        ] },
        { kind: "end", exit: "return", title: "Return the counts", sub: "created, updated, errors", lines: [33, 33] },
      ],
    },
    vi: {
      title: "Nhập đơn hàng từ CSV",
      summary: "Đọc file CSV của nhà cung cấp, ghi lại dòng lỗi thay vì dừng, bỏ cuộc nếu quá 10% dòng lỗi, rồi lưu đơn mới và đơn thay đổi trong một transaction.",
      steps: [
        { kind: "start", title: "importOrders(path)", sub: "job chạy mỗi đêm gọi vào", lines: [1, 2] },
        { kind: "loop", title: "Với mỗi dòng CSV", sub: "đánh số từ dòng 2", tag: "FILE", lines: [4, 14], steps: [
          { kind: "step", title: "Đọc dòng", sub: "giá thành Decimal, SKU viết hoa", lines: [5, 9] },
          { kind: "step", title: "Dòng lỗi: ghi lại", sub: "vẫn nhập tiếp", attention: true, lines: [10, 13], detail: "Thiếu cột hay giá sai định dạng chỉ làm dòng đó vào danh sách lỗi." },
        ] },
        { kind: "step", title: "Kiểm tra tỉ lệ lỗi", sub: "quá 10% dòng lỗi?", lines: [16, 16] },
        { kind: "branch", lanes: [
          { title: "Quá 10%", lines: [16, 17], steps: [{ kind: "end", exit: "throw", title: "ImportAborted", sub: "không ghi gì", lines: [17, 17] }] },
          { title: "Trong ngưỡng", sub: "dòng lỗi bị bỏ qua", lines: [19, 19], steps: [] },
        ] },
        { kind: "call", title: "diffWithDatabase()", sub: "đơn mới và đơn thay đổi", tag: "DB", lines: [19, 26] },
        { kind: "parallel", lanes: [
          { title: "Lưu đơn", sub: "một transaction", tag: "DB", lines: [28, 30], steps: [] },
          { title: "Báo cho sales", tag: "EMAIL", lines: [31, 31], steps: [] },
        ] },
        { kind: "end", exit: "return", title: "Trả về các con số", sub: "đã tạo, đã cập nhật, lỗi", lines: [33, 33] },
      ],
    },
  };

  // A second, tiny example for code with several entry points (a UI component, a controller, a class).
  const SECTIONS_EXAMPLE = '{"kind": "section", "title": "On save click", "steps": [{"kind": "start", "title": "onSave()", "tag": "UI"}, {"kind": "call", "title": "api.save(form)", "tag": "API"}]}';

  const CHANGE_RULES = [
    "This is a CODE CHANGE. The listing below is the NEW code with the change marked: \"N+|\" lines were added, \"-|\" lines were removed (they have no number in the new code), \"N |\" lines are unchanged.",
    "- Diagram the WHOLE flow of the new code, not only the change, so the reader sees where the change sits.",
    '- Mark boxes the change touches: "change": "added" (logic that exists only in the new code), "modified" (logic whose behavior changed), "removed" (logic that existed before and is gone). Leave "change" out for unchanged boxes.',
    '- A removed box stays where it used to be in the flow; give it "lines" = the new line number where the removed lines were.',
    '- "changeNote" on every changed box: 1 to 2 plain sentences, what changed and why it matters (the bug it fixes, the behavior that is different now).',
    '- Add "changeSummary" to the top object: 1 to 3 sentences on what the change does overall, the bug and the fix, and any risk you see.',
    "- Do not mark formatting-only or comment-only edits as changes.",
  ];

  /**
   * The instruction Claude receives. opts: {language: "vi"|"en", detail, codeLanguage, change: compare() result or null}.
   * With opts.change the code block is the merged listing of the new code with the change marked.
   */
  function buildPrompt(code, opts) {
    const o = opts || {};
    const lang = o.language === "en" ? "English" : "Vietnamese";
    const size = SIZE[o.detail] || SIZE.normal;
    const codeLang = o.codeLanguage || guessLanguage(code);
    const nLines = String(code).split("\n").length;
    const change = o.change && o.change.stats && o.change.stats.changed ? o.change : null;
    const out = [
      "You turn source code into a simple, visual flow diagram that helps a developer understand the logic step by step, top to bottom.",
      "",
      "Return one JSON object: {\"title\", \"summary\", \"steps\": [Node, ...]}. Every Node has \"kind\", \"title\", \"sub\", \"detail\", \"lines\": [from, to], optional \"attention\": true and optional \"tag\". Kinds:",
      '- "start": the entry point: the request, event, call, schedule or user action that starts this flow. One per flow (or per section), first.',
      '- "step": one action.',
      '- "call": a call into another function, method or service whose inside is not shown here.',
      '- "stage": a main phase (shown highlighted). Number main phases "1. ...", "2. ..." when the code has clear phases.',
      '- "end": the path STOPS here. Add "exit": "return" | "throw" | "respond" (HTTP response, render) | "break" | "continue" | "exit". A lane that ends does not rejoin; inside a loop, "continue" and "break" end only that pass.',
      '- "group": several things combined in one phase (tables joined, sources merged). + "items": [{"title", "sub", "lines"}], "note". 2 to 6 items.',
      '- "loop": repeated work (for, while, map, retry, cursor, polling). title like "For each …" / "Retry up to 3×"; + "steps": the body.',
      '- "branch": mutually exclusive paths (if/else, switch, match, pattern, try/catch). + "lanes": [{"title": answer / condition value, "sub", "detail", "lines", "attention", "steps"}]. Lanes that do not end rejoin after the branch.',
      '- "parallel": paths that ALL run at the same time and are awaited together (Promise.all, goroutines + WaitGroup, Task.WhenAll, async gather). Same "lanes" shape.',
      '- "section": only at the top level, for code with several independent entry points (a UI component with effects and event handlers, a controller with several endpoints, a class with several public methods, a reducer with actions). + "steps". Each section starts with its own "start". Example: ' + SECTIONS_EXAMPLE,
      '"tag" marks an external effect with one short word: DB, API, FILE, QUEUE, CACHE, UI, EMAIL, AI, LOG, AUTH, TIMER, STATE.',
      "",
      "Example of the shape (an invented import function; copy the structure and the style of the wording, not the content):",
      JSON.stringify(EXAMPLE[o.language === "en" ? "en" : "vi"]),
      "",
      "Hard limits (the diagram becomes unreadable beyond them):",
      `- At most ${size.total} boxes in total, counting lanes and loop/branch/section contents. ${size.top} boxes at the top level of each flow.`,
      `- At most 5 lanes per branch or parallel. Branches, loops and parallels nest at most ${size.depth} level${size.depth > 1 ? "s" : ""} deep. If the code goes deeper, summarize the inner part as one step and explain it in "detail".`,
      "- title: at most 30 characters. sub: at most 60 characters. Plain words a newcomer understands; keep code identifiers (table, variable, function names) exactly as written.",
      `- Write every title, sub, detail, note and changeNote in ${lang}.`,
      "",
      "How to model the code:",
      "- Start each flow with a \"start\" box. The last box on the main path is the output, the response or the final effect (often an \"end\").",
      "- Name the decision once: normally a step right before the branch says what is checked (\"Check the error rate\" / sub \"more than 10% bad rows?\") and the branch title stays empty. Give the branch a title only when there is no such step. Lane titles are the answers (\"empty\", \"= 'kanban'\", \"error\", \"Ok(v)\").",
      "- Guard clauses (if bad: return / throw) are a branch with a lane ending in an \"end\" box and a lane for the normal path (that lane may have no steps).",
      "- try/catch: a branch with lanes like \"success\" and \"error\" when the error path does something meaningful; finally work goes after the branch.",
      "- Nothing follows an end box in the same list: an end is always the last box of its lane, section or flow.",
      "- Use a loop only for real repetition. A SQL sub-query or a JOIN is not a loop; recursion is a \"call\" to the same function with a note in \"detail\".",
      "- If the code has several functions but one entry point, diagram that entry point and show the others as \"call\" boxes. Use sections only for several independent entry points.",
      "- If the entry point only delegates (it loops and calls a helper, or starts a recursive function), the helper is where the logic is: give the helper its own section and diagram its body; show the recursive call inside it as a \"call\" box whose sub says it recurses.",
      "- Callbacks the framework or runtime calls on its own (failed(), onError, cleanup / unmount, retry hooks, event and message handlers) are separate entry points: give each one its own section.",
      `- ${size.extra} Describe behavior, not syntax. Merge trivial lines. Never invent behavior the code does not have.`,
      "- detail: 1 to 3 plain sentences: why this step exists and what to watch for. No code.",
      "- lines: 1-based line numbers from the numbered listing below, first and last line the box describes. Every box gets lines.",
      "- attention: true on at most 3 boxes a reader must look at twice: surprising behavior, side effects, performance traps, values left unset, a path that behaves differently.",
    ];
    if (change) out.push("", ...CHANGE_RULES);
    out.push("", "Reply with only the JSON object.", "");
    if (change) {
      out.push(`Code change (${codeLang}, new code has ${nLines} lines; +${change.stats.added} / -${change.stats.removed} lines):`, "```", LL.diff.listingForPrompt(change), "```");
    } else {
      out.push(`Code (${codeLang}, ${nLines} lines, numbered):`, "```", numberLines(code), "```");
    }
    return out.join("\n");
  }

  /** Extract a Flow from a pasted reply (JSON, fenced JSON, or the text format). */
  function parseReply(text) {
    const t = String(text || "").trim();
    if (!t) return { flow: null, error: "Câu trả lời đang trống." };
    const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidates = [t, fenced && fenced[1]];
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first !== -1 && last > first) candidates.push(t.slice(first, last + 1));
    for (const c of candidates) {
      if (!c) continue;
      let parsed;
      try { parsed = JSON.parse(c); } catch (e) { continue; }
      const flow = normalize(parsed);
      if (flow.steps.length) return { flow, error: null };
    }
    const asText = parseText(t);
    if (asText.flow.steps.length && asText.errors.length < asText.flow.steps.length) return { flow: asText.flow, error: null, errors: asText.errors };
    return { flow: null, error: "Không tìm thấy sơ đồ trong nội dung này. Hãy dán nguyên đoạn JSON mà Claude trả về." };
  }

  Object.assign(LL.flow, { buildPrompt, parseReply });
})(globalThis.LL = globalThis.LL || {});
