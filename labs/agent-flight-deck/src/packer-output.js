/* Agent Flight Deck — Load Sheet output: comment stripping, prompt assembly, file tree, treemap layout. */
(function (AFD) {
  "use strict";

  // ───────────────────────── comment stripping ─────────────────────────

  /**
   * Comment syntax per language family. `multi` lists string delimiters that may span lines
   * (template literals, triple quotes); `single` lists delimiters that end at the end of the line.
   */
  const SYNTAX = {
    c: { line: "//", block: ["/*", "*/"], single: ['"', "'"], multi: ["`"], regex: true },
    py: { line: "#", block: null, single: ['"', "'"], multi: ['"""', "'''"] },
    sh: { line: "#", block: null, single: ['"', "'"], multi: [], heredoc: true },
    sql: { line: "--", block: ["/*", "*/"], single: [], multi: ["'"] },
    css: { line: null, block: ["/*", "*/"], single: ['"', "'"], multi: [] },
  };
  const FAMILY = { ts: "c", js: "c", go: "c", rs: "c", java: "c", cs: "c", php: "c", swift: "c", c: "c", css: "css", py: "py", rb: "sh", sh: "sh", sql: "sql" };
  // comments that change how code is checked or run: never strip them
  const KEEP = /^(\/\/\/\s*<reference|\/\/\s*@ts-|\/\/\s*eslint-|\/\/\s*prettier-|\/\/go:|#\s*(type:|noqa|pragma|pylint|-\*-)|#!|\/\*\s*eslint|\/\*\*?\s*@(jsx|flow|vite|webpack))/;

  /**
   * Scan one line from a given state; returns the state at the end of the line.
   * state: {block: bool, str: delimiter|null}
   */
  function scan(line, st, syn) {
    let { block, str } = st;
    let i = 0;
    let prev = ""; // last significant character outside strings, to tell a regex literal from division
    while (i < line.length) {
      if (block) {
        const end = line.indexOf(syn.block[1], i);
        if (end === -1) return { block: true, str: null };
        block = false;
        i = end + syn.block[1].length;
        continue;
      }
      if (str) {
        if (str.length === 1 && line[i] === "\\") { i += 2; continue; }
        if (line.startsWith(str, i)) { i += str.length; str = null; continue; }
        i++;
        continue;
      }
      if (syn.line && line.startsWith(syn.line, i)) break;
      if (syn.block && line.startsWith(syn.block[0], i)) { block = true; i += syn.block[0].length; continue; }
      // a regex literal (/…/) in C-like code: skip it so a quote or backtick inside it is not taken as a string
      if (syn.regex && line[i] === "/" && (prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\breturn\s*$/.test(line.slice(0, i)))) {
        let j = i + 1;
        let cls = false;
        while (j < line.length) {
          const ch = line[j];
          if (ch === "\\") { j += 2; continue; }
          if (ch === "[") cls = true;
          else if (ch === "]") cls = false;
          else if (ch === "/" && !cls) break;
          j++;
        }
        if (j < line.length) { i = j + 1; prev = "/"; continue; }
      }
      const multi = syn.multi.find((d) => line.startsWith(d, i));
      if (multi) { str = multi; i += multi.length; continue; }
      const single = syn.single.find((d) => line[i] === d);
      if (single) { str = single; i++; continue; }
      if (line[i] !== " " && line[i] !== "\t") prev = line[i];
      i++;
    }
    // single-line strings do not continue onto the next line
    if (str && !syn.multi.includes(str)) str = null;
    return { block, str };
  }

  /**
   * Remove whole-line comments, never touching anything inside a string (template literals and triple-quoted
   * strings included). A line is removed only when it starts outside any string and is entirely comment.
   */
  function stripComments(text, lang) {
    const syn = SYNTAX[FAMILY[lang]];
    if (!syn) return text;
    const lines = text.split("\n");
    const out = [];
    let st = { block: false, str: null };
    let heredoc = null; // shell: the word that closes a here-document; its body is data, never comments
    for (let n = 0; n < lines.length; n++) {
      const line = lines[n];
      const t = line.trim();
      if (heredoc) {
        out.push(line);
        if (t === heredoc) heredoc = null;
        continue;
      }
      if (syn.heredoc) {
        const hd = line.match(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1/);
        if (hd && !t.startsWith("#")) { out.push(line); heredoc = hd[2]; continue; }
      }
      if (st.str) { out.push(line); st = scan(line, st, syn); continue; }
      if (st.block) {
        const end = line.indexOf(syn.block[1]);
        if (end === -1) continue; // still inside a block comment
        const rest = line.slice(end + syn.block[1].length);
        st = scan(rest, { block: false, str: null }, syn);
        if (rest.trim()) out.push(line.slice(0, line.length - line.trimStart().length) + rest.trim());
        continue;
      }
      if (KEEP.test(t)) { out.push(line); continue; }
      if (syn.line && t.startsWith(syn.line)) continue;
      if (syn.block && t.startsWith(syn.block[0])) {
        const after = scan(t, { block: false, str: null }, syn);
        const close = t.indexOf(syn.block[1], syn.block[0].length);
        if (after.block) { st = after; continue; } // opens a block that runs onto later lines
        if (close !== -1 && !t.slice(close + syn.block[1].length).trim()) continue; // the whole line is one block comment
        out.push(line);
        st = after;
        continue;
      }
      out.push(line);
      st = scan(line, st, syn);
    }
    return out.join("\n");
  }

  function transform(text, lang, opts) {
    const o = opts || {};
    let result = o.stripComments ? stripComments(text, lang) : text;
    if (o.trimTrailing) result = result.replace(/[ \t]+$/gm, "");
    if (o.collapseBlank) result = result.replace(/\n{3,}/g, "\n\n");
    return result;
  }

  const anyTransform = (o) => !!(o && (o.stripComments || o.collapseBlank || o.trimTrailing));

  function packedText(f, o) {
    if (!anyTransform(o)) return f.text;
    const key = (o.stripComments ? "c" : "") + (o.collapseBlank ? "b" : "") + (o.trimTrailing ? "t" : "");
    if (f._tkey !== key) {
      f._tkey = key;
      f._ttext = transform(f.text, f.lang, o);
      f._ttokens = AFD.packer.estimateTokens(f._ttext);
    }
    return f._ttext;
  }

  function packedTokens(f, o) {
    if (!anyTransform(o)) return f.tokens;
    packedText(f, o);
    return f._ttokens;
  }

  /** Tokens a file costs inside the prompt: its body plus the wrapper around it (source path, tags or fence). */
  function docTokens(f, o) {
    if (f._wrapTok == null) f._wrapTok = AFD.packer.estimateTokens(`<document index="100">\n<source>${f.path}</source>\n<document_content>\n\n</document_content>\n</document>\n`);
    return packedTokens(f, o) + f._wrapTok;
  }

  // ───────────────────────── output ─────────────────────────

  /** ASCII tree of included paths. */
  function tree(paths) {
    const rootNode = {};
    for (const p of paths) {
      let node = rootNode;
      for (const part of p.split("/")) node = node[part] = node[part] || {};
    }
    const lines = [];
    const walk = (node, prefix) => {
      const keys = Object.keys(node).sort((a, b) => {
        const ad = Object.keys(node[a]).length > 0;
        const bd = Object.keys(node[b]).length > 0;
        return ad === bd ? a.localeCompare(b) : ad ? -1 : 1;
      });
      keys.forEach((k, i) => {
        const last = i === keys.length - 1;
        const isDir = Object.keys(node[k]).length > 0;
        lines.push(prefix + (last ? "└── " : "├── ") + k + (isDir ? "/" : ""));
        if (isDir) walk(node[k], prefix + (last ? "    " : "│   "));
      });
    };
    walk(rootNode, "");
    return lines.join("\n");
  }

  const FENCE_LANG = { ts: "ts", js: "js", py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", cs: "csharp", php: "php", swift: "swift", c: "c", css: "css", html: "html", data: "", doc: "markdown", sh: "bash", sql: "sql", other: "" };

  function escapeXml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /**
   * Build the final prompt. Long documents go first and the question last, which is what Anthropic's
   * long-context guidance recommends.
   * opts: {format: "xml"|"markdown"|"plain", includeTree, question, projectName, transform:{...}}
   */
  function buildPrompt(files, opts) {
    const o = opts || {};
    const chosen = files.filter((f) => f.include);
    const parts = [];
    const fmt = o.format || "xml";
    const name = o.projectName || "project";
    if (fmt === "xml") {
      if (o.includeTree) parts.push(`<directory_structure project="${escapeXml(name)}">\n${tree(chosen.map((f) => f.path))}\n</directory_structure>\n`);
      parts.push("<documents>");
      chosen.forEach((f, i) => {
        parts.push(`<document index="${i + 1}">\n<source>${escapeXml(f.path)}</source>\n<document_content>\n${packedText(f, o.transform)}\n</document_content>\n</document>`);
      });
      parts.push("</documents>");
      if (o.question && o.question.trim()) parts.push(`\n<question>\n${o.question.trim()}\n</question>`);
    } else if (fmt === "markdown") {
      parts.push(`# ${name}\n`);
      if (o.includeTree) parts.push("## Files\n\n```\n" + tree(chosen.map((f) => f.path)) + "\n```\n");
      for (const f of chosen) {
        const body = packedText(f, o.transform);
        const fence = body.includes("```") ? "````" : "```";
        parts.push(`## ${f.path}\n\n${fence}${FENCE_LANG[f.lang] || ""}\n${body}\n${fence}\n`);
      }
      if (o.question && o.question.trim()) parts.push("## Question\n\n" + o.question.trim());
    } else {
      if (o.includeTree) parts.push(tree(chosen.map((f) => f.path)) + "\n");
      for (const f of chosen) parts.push(`===== ${f.path} =====\n${packedText(f, o.transform)}\n`);
      if (o.question && o.question.trim()) parts.push("===== question =====\n" + o.question.trim());
    }
    const text = parts.join("\n");
    return { text, tokens: AFD.packer.estimateTokens(text), files: chosen.length };
  }

  // ───────────────────────── treemap ─────────────────────────

  /**
   * Squarified treemap (Bruls, Huizing, van Wijk). items: [{value, ...}] -> [{x, y, w, h, item}]
   */
  function squarify(items, x, y, w, h) {
    const data = items.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    const total = data.reduce((s, d) => s + d.value, 0);
    const out = [];
    if (!total || w <= 0 || h <= 0) return out;
    const scale = (w * h) / total;
    const areas = data.map((d) => ({ item: d, area: d.value * scale }));
    let rect = { x, y, w, h };
    let row = [];
    let i = 0;
    const worst = (r, side) => {
      const s = r.reduce((a, b) => a + b.area, 0);
      let max = 0;
      let min = Infinity;
      for (const c of r) { if (c.area > max) max = c.area; if (c.area < min) min = c.area; }
      const s2 = s * s;
      const side2 = side * side;
      return Math.max((side2 * max) / s2, s2 / (side2 * min));
    };
    const layoutRow = (r) => {
      const s = r.reduce((a, b) => a + b.area, 0);
      if (rect.w >= rect.h) {
        const colW = s / rect.h;
        let yy = rect.y;
        for (const c of r) {
          const hh = c.area / colW;
          out.push({ x: rect.x, y: yy, w: colW, h: hh, item: c.item });
          yy += hh;
        }
        rect = { x: rect.x + colW, y: rect.y, w: rect.w - colW, h: rect.h };
      } else {
        const rowH = s / rect.w;
        let xx = rect.x;
        for (const c of r) {
          const ww = c.area / rowH;
          out.push({ x: xx, y: rect.y, w: ww, h: rowH, item: c.item });
          xx += ww;
        }
        rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
      }
    };
    while (i < areas.length) {
      const side = Math.min(rect.w, rect.h);
      const c = areas[i];
      if (!row.length || worst(row.concat([c]), side) <= worst(row, side)) {
        row.push(c);
        i++;
      } else {
        layoutRow(row);
        row = [];
      }
    }
    if (row.length) layoutRow(row);
    return out;
  }

  Object.assign(AFD.packer, { transform, stripComments, packedText, packedTokens, docTokens, buildPrompt, tree, squarify });
})(globalThis.AFD = globalThis.AFD || {});
