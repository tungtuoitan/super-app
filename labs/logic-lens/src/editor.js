/* Logic Lens — code editor: a transparent textarea over a highlighted copy of the code, with a gutter for line
 * numbers, diff marks (added lines, places where lines were removed) and the selected box's range.
 */
(function (LL) {
  "use strict";

  const LH = 20; // line height in px; must match .ed-l / .ed-ta in the CSS

  function create(root, opts) {
    const o = opts || {};
    root.classList.add("ed");
    root.innerHTML = '<div class="ed-gutter" aria-hidden="true"><div class="ed-gin"></div></div><div class="ed-body"><div class="ed-hl" aria-hidden="true"><div class="ed-hin"></div></div><textarea class="ed-ta" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off"></textarea></div>';
    const gin = root.querySelector(".ed-gin");
    const hin = root.querySelector(".ed-hin");
    const ta = root.querySelector(".ed-ta");
    if (o.placeholder) ta.placeholder = o.placeholder;
    if (o.label) ta.setAttribute("aria-label", o.label);
    if (o.readOnly) ta.readOnly = true;
    let language = "code";
    let marks = { added: new Set(), delAt: new Map(), removed: new Set() };
    let range = null;
    let timer = 0;

    function render() {
      const value = ta.value;
      const lines = LL.highlight.highlight(value, language);
      const g = [];
      const h = [];
      lines.forEach((html, i) => {
        const n = i + 1;
        const on = range && n >= range[0] && n <= range[1] ? " on" : "";
        const add = marks.added.has(n) ? " add" : "";
        const gone = (marks.delAt.get(n) || []).length;
        const tail = n === lines.length ? (marks.delAt.get(n + 1) || []).length : 0; // removed after the last line
        const del = gone ? " del" : tail ? " del-after" : "";
        const title = gone || tail ? ` title="${gone || tail} dòng đã xoá ${gone ? "ngay trước dòng này" : "sau dòng này"}"` : "";
        const rm = marks.removed.has(n) ? " rm" : "";
        g.push(`<div class="ed-g${on}${add}${del}${rm}"${title}>${n}</div>`);
        h.push(`<div class="ed-l${on}${add}${del}${rm}">${html}</div>`);
      });
      gin.innerHTML = g.join("");
      hin.innerHTML = h.join("");
      sync();
    }
    function sync() {
      hin.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      gin.style.transform = `translateY(${-ta.scrollTop}px)`;
    }

    ta.addEventListener("scroll", sync);
    ta.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(render, ta.value.length > 60000 ? 220 : 50);
      if (o.onInput) o.onInput(ta.value);
    });
    ta.addEventListener("keydown", (e) => {
      // Tab inserts spaces instead of leaving the editor (Shift+Tab still moves focus out)
      if (e.key === "Tab" && !e.shiftKey && !ta.readOnly) {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText("  ", s, ta.selectionEnd, "end");
        ta.dispatchEvent(new Event("input"));
      }
    });
    ta.addEventListener("click", () => {
      if (!o.onLineClick || ta.selectionStart !== ta.selectionEnd) return;
      o.onLineClick(ta.value.slice(0, ta.selectionStart).split("\n").length);
    });

    const api = {
      el: root,
      textarea: ta,
      getValue: () => ta.value,
      setValue(v) {
        ta.value = String(v || "").replace(/\r\n/g, "\n");
        ta.scrollTop = 0;
        ta.scrollLeft = 0;
        render();
      },
      setLanguage(l) {
        if (l !== language) { language = l; render(); }
      },
      setMarks(m) {
        marks = { added: (m && m.added) || new Set(), delAt: (m && m.delAt) || new Map(), removed: (m && m.removed) || new Set() };
        render();
      },
      /** Highlight a line range and optionally scroll it into view. */
      setRange(r, scroll) {
        range = r || null;
        // only the lines whose state changes are touched
        gin.querySelectorAll(".ed-g.on").forEach((e) => e.classList.remove("on"));
        hin.querySelectorAll(".ed-l.on").forEach((e) => e.classList.remove("on"));
        if (!range) return;
        const gs = gin.children;
        const hs = hin.children;
        for (let i = range[0]; i <= Math.min(range[1], gs.length); i++) { gs[i - 1].classList.add("on"); hs[i - 1].classList.add("on"); }
        if (scroll) api.scrollToRange(range);
      },
      scrollToRange(r) {
        const view = ta.clientHeight;
        const span = (r[1] - r[0] + 1) * LH;
        const top = (r[0] - 1) * LH;
        const target = span < view * 0.8 ? top - (view - span) / 3 : top - 20;
        ta.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
      },
      lineCount: () => ta.value.split("\n").length,
      focus: () => ta.focus(),
      render,
    };
    render();
    return api;
  }

  LL.editor = { create, LH };
})(globalThis.LL = globalThis.LL || {});
