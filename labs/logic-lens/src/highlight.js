/* Logic Lens — a small syntax highlighter for the code editor: comments, strings, numbers, keywords.
 * Line by line with carried state (block comments, multi-line strings), good enough to read code, not a parser.
 */
(function (LL) {
  "use strict";

  const KW = new Set((
    // shared C-family / JS / TS / Java / C# / Go / Rust / Kotlin / PHP / Python / Ruby / shell / SQL keywords
    "if else for while do switch case default break continue return throw try catch finally new delete typeof instanceof in of " +
    "function class extends implements interface type enum const let var static public private protected readonly abstract override " +
    "async await yield import export from as package namespace using void null undefined true false this super self " +
    "func go defer chan select struct map range fn let mut impl trait match pub use mod where loop crate " +
    "val fun suspend object when is data sealed companion lateinit " +
    "def elif lambda pass raise with assert global nonlocal not and or None True False end begin rescue ensure unless until then " +
    "echo fi esac done elif local export set trap read " +
    "select insert update delete from where join left right inner outer on group by order having into values as and or not null is " +
    "create alter procedure proc begin end declare exec execute transaction commit rollback cursor fetch open close table view top distinct union"
  ).split(/\s+/));

  const COMMENT = {
    c: { line: ["//"], block: ["/*", "*/"] },
    py: { line: ["#"], block: null },
    sh: { line: ["#"], block: null },
    sql: { line: ["--"], block: ["/*", "*/"] },
  };
  const FAMILY = { python: "py", ruby: "sh", shell: "sh", sql: "sql" };

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /**
   * Highlight all lines. Returns an array of HTML strings (one per line) with spans:
   * .t-c comment, .t-s string, .t-n number, .t-k keyword, .t-f function call.
   */
  function highlight(code, language) {
    const syn = COMMENT[FAMILY[language] || "c"];
    const triple = language === "python";
    const lines = String(code).split("\n");
    const out = [];
    let inBlock = false;
    let inStr = null; // multi-line string delimiter carried to the next line
    for (const line of lines) {
      let html = "";
      let i = 0;
      const n = line.length;
      const push = (cls, text) => { html += cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text); };
      while (i < n) {
        if (inBlock) {
          const end = line.indexOf(syn.block[1], i);
          const stop = end === -1 ? n : end + syn.block[1].length;
          push("t-c", line.slice(i, stop));
          i = stop;
          if (end !== -1) inBlock = false;
          continue;
        }
        if (inStr) {
          let j = i;
          while (j < n && !line.startsWith(inStr, j)) j += line[j] === "\\" ? 2 : 1;
          const stop = j >= n ? n : j + inStr.length;
          push("t-s", line.slice(i, stop));
          i = stop;
          if (j < n) inStr = null;
          continue;
        }
        const rest = line.slice(i);
        const lc = syn.line.find((t) => rest.startsWith(t));
        if (lc && !(lc === "#" && /^#\{/.test(rest))) { push("t-c", rest); break; }
        if (syn.block && rest.startsWith(syn.block[0])) { inBlock = true; continue; }
        if (triple && (rest.startsWith('"""') || rest.startsWith("'''"))) { const d = rest.slice(0, 3); push("t-s", d); i += 3; inStr = d; continue; }
        const ch = line[i];
        if (ch === '"' || ch === "'" || ch === "`") {
          let j = i + 1;
          while (j < n && line[j] !== ch) j += line[j] === "\\" ? 2 : 1;
          if (j >= n && ch === "`") { push("t-s", rest); inStr = "`"; break; }
          push("t-s", line.slice(i, Math.min(n, j + 1)));
          i = Math.min(n, j + 1);
          continue;
        }
        const num = rest.match(/^\d[\d_.xXa-fA-F]*/);
        if (num && !/\w/.test(line[i - 1] || "")) { push("t-n", num[0]); i += num[0].length; continue; }
        const word = rest.match(/^[A-Za-z_@$][\w$]*/);
        if (word) {
          const w = word[0];
          const lower = w.toLowerCase();
          const isKw = KW.has(language === "sql" ? lower : w) || (language === "sql" && KW.has(lower));
          const isCall = !isKw && line[i + w.length] === "(";
          push(isKw ? "t-k" : isCall ? "t-f" : "", w);
          i += w.length;
          continue;
        }
        push("", ch);
        i++;
      }
      out.push(html || " ");
    }
    return out;
  }

  LL.highlight = { highlight };
})(globalThis.LL = globalThis.LL || {});
