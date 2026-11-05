/* Logic Lens — the instruction sent to Claude, and reading a pasted reply back into a flow. */
(function (LL) {
  "use strict";

  const { normalize, parseText, guessLanguage, numberLines } = LL.flow;

  // ───────────────────────── prompt ─────────────────────────

  const SIZE = {
    simple: { total: 10, top: "4 to 7", depth: 1, extra: "Only show the main path and the main split; fold everything else into the boxes." },
    normal: { total: 16, top: "5 to 9", depth: 2, extra: "Show the real branches and phases; fold small checks into the box they belong to." },
    detailed: { total: 26, top: "6 to 12", depth: 2, extra: "Include every meaningful check and branch, still within the limits." },
  };

  // One worked example per output language (Claude mirrors the example's wording). Content is invented.
  const EXAMPLE = {
    en: {
      title: "Import orders from CSV",
      summary: "Reads a supplier CSV, collects bad rows instead of stopping, gives up above 10% bad rows, then saves new and changed orders in one transaction.",
      steps: [
        { kind: "step", title: "Receive the file", sub: "path, dry_run flag", lines: [1, 2] },
        { kind: "loop", title: "For each CSV row", sub: "numbered from line 2", lines: [4, 14], steps: [
          { kind: "step", title: "Parse the row", sub: "price as Decimal, SKU upper-cased", lines: [5, 9] },
          { kind: "step", title: "Bad row: note it", sub: "the import goes on", attention: true, lines: [10, 13], detail: "Missing columns or a malformed price only add the row to the error list." },
        ] },
        { kind: "step", title: "Check the error rate", sub: "more than 10% bad rows?", lines: [16, 16] },
        { kind: "branch", lanes: [
          { title: "Over 10%", lines: [16, 17], steps: [{ kind: "end", title: "Raise ImportAborted", sub: "nothing is written", lines: [17, 17] }] },
          { title: "Within the limit", sub: "bad rows are skipped", lines: [19, 19], steps: [] },
        ] },
        { kind: "group", title: "1. Compare with the database", lines: [19, 26], items: [{ title: "Look up by SKU", sub: "one query", lines: [19, 19] }, { title: "New", sub: "SKU not found" }, { title: "Changed", sub: "price or stock differs" }], note: "Unchanged rows are ignored" },
        { kind: "stage", title: "2. Save in one transaction", sub: "bulk create + bulk update", lines: [28, 30] },
        { kind: "stage", title: "Return the counts", sub: "created, updated, errors", lines: [31, 31] },
      ],
    },
    vi: {
      title: "Nhập đơn hàng từ CSV",
      summary: "Đọc file CSV của nhà cung cấp, ghi lại dòng lỗi thay vì dừng, bỏ cuộc nếu quá 10% dòng lỗi, rồi lưu đơn mới và đơn thay đổi trong một transaction.",
      steps: [
        { kind: "step", title: "Nhận file", sub: "đường dẫn, cờ dry_run", lines: [1, 2] },
        { kind: "loop", title: "Với mỗi dòng CSV", sub: "đánh số từ dòng 2", lines: [4, 14], steps: [
          { kind: "step", title: "Đọc dòng", sub: "giá thành Decimal, SKU viết hoa", lines: [5, 9] },
          { kind: "step", title: "Dòng lỗi: ghi lại", sub: "vẫn nhập tiếp", attention: true, lines: [10, 13], detail: "Thiếu cột hay giá sai định dạng chỉ làm dòng đó vào danh sách lỗi." },
        ] },
        { kind: "step", title: "Kiểm tra tỉ lệ lỗi", sub: "quá 10% dòng lỗi?", lines: [16, 16] },
        { kind: "branch", lanes: [
          { title: "Quá 10%", lines: [16, 17], steps: [{ kind: "end", title: "Ném ImportAborted", sub: "không ghi gì", lines: [17, 17] }] },
          { title: "Trong ngưỡng", sub: "dòng lỗi bị bỏ qua", lines: [19, 19], steps: [] },
        ] },
        { kind: "group", title: "1. So với database", lines: [19, 26], items: [{ title: "Tra theo SKU", sub: "một truy vấn", lines: [19, 19] }, { title: "Mới", sub: "chưa có SKU" }, { title: "Thay đổi", sub: "khác giá hoặc tồn" }], note: "Dòng không đổi thì bỏ qua" },
        { kind: "stage", title: "2. Lưu trong một transaction", sub: "tạo hàng loạt + cập nhật hàng loạt", lines: [28, 30] },
        { kind: "stage", title: "Trả về các con số", sub: "đã tạo, đã cập nhật, lỗi", lines: [31, 31] },
      ],
    },
  };

  /** The instruction Claude receives, with the numbered code. */
  function buildPrompt(code, opts) {
    const o = opts || {};
    const lang = o.language === "en" ? "English" : "Vietnamese";
    const size = SIZE[o.detail] || SIZE.normal;
    const codeLang = o.codeLanguage || guessLanguage(code);
    const nLines = String(code).split("\n").length;
    return [
      "You turn source code into a simple, visual flow diagram that helps a developer understand the logic step by step, top to bottom.",
      "",
      "Return one JSON object: {\"title\", \"summary\", \"steps\": [Node, ...]}. Node kinds:",
      '- {"kind": "step", "title", "sub", "detail", "lines": [from, to], "attention": false}  one action',
      '- {"kind": "stage", ...same}  a main phase of the code (shown highlighted). Number main phases "1. ...", "2. ..." when the code has clear phases.',
      '- {"kind": "end", ...same}  the path STOPS here: return, throw, raise, exit, early response. A lane that ends with "end" does not rejoin the flow.',
      '- {"kind": "group", ...same, "items": [{"title", "sub", "lines"}], "note"}  several things combined in one phase: tables joined, sources merged, calls run in parallel. 2 to 6 items.',
      '- {"kind": "loop", ...same, "steps": [Node, ...]}  repeated work (for, while, map, cursor). title starts with "For each ..." (or the Vietnamese equivalent); steps are the body.',
      '- {"kind": "branch", "title": "", "lanes": [{"title": "answer / condition value", "sub", "detail", "lines", "attention", "steps": [Node, ...]}]}  mutually exclusive paths (if/else, switch, modes). Lanes that do not end rejoin after the branch.',
      "",
      "Example of the shape (an invented import function; copy the structure and the style of the wording, not the content):",
      JSON.stringify(EXAMPLE[o.language === "en" ? "en" : "vi"]),
      "",
      "Hard limits (the diagram becomes unreadable beyond them):",
      `- At most ${size.total} boxes in total, counting lanes and loop/branch contents. ${size.top} boxes at the top level.`,
      `- At most 4 lanes per branch. Branches and loops nest at most ${size.depth} level${size.depth > 1 ? "s" : ""} deep. If the code goes deeper, summarize the inner part as one step and explain it in "detail".`,
      "- title: at most 30 characters. sub: at most 60 characters. Plain words a newcomer understands; keep code identifiers (table, variable, function names) exactly as written.",
      `- Write every title, sub, detail and note in ${lang}.`,
      "",
      "How to model the code:",
      "- The first box is the input (parameters, request, arguments). The last box on the main path is the output or final effect.",
      "- Name the decision once: normally a step right before the branch says what is checked (\"Check the error rate\" / sub \"more than 10% bad rows?\") and the branch title stays empty. Give the branch a title only when there is no such step. Lane titles are the answers (\"empty\", \"= 'kanban'\", \"error\").",
      "- Nothing follows an end box in the same list: an end is always the last box of its lane or of the whole flow.",
      "- Guard clauses (if bad: return / throw) are a branch with a lane ending in an \"end\" box and a lane for the normal path (that lane may have no steps).",
      "- try/catch: a branch with lanes \"success\" and \"error\" when the error path does something meaningful.",
      "- If the code has several functions, diagram the main entry point; show calls to the others as single steps titled with the function name.",
      "- Use a loop only for real repetition in the code (for, while, forEach, map, a cursor). A SQL sub-query or a JOIN is not a loop.",
      `- ${size.extra} Describe behavior, not syntax. Merge trivial lines. Never invent behavior the code does not have.`,
      "- detail: 1 to 3 plain sentences: why this step exists and what to watch for. No code.",
      '- lines: 1-based line numbers from the numbered listing below, first and last line the box describes. Every box gets lines.',
      "- attention: true on at most 3 boxes a reader must look at twice: surprising behavior, side effects, performance traps, values left unset, a path that behaves differently.",
      "",
      "Reply with only the JSON object.",
      "",
      `Code (${codeLang}, ${nLines} lines, numbered):`,
      "```",
      numberLines(code),
      "```",
    ].join("\n");
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
