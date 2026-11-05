/* Agent Flight Deck — shared UI helpers (DOM, formatting, tooltip, files). */
(function (AFD) {
  "use strict";

  /** h("div.cls#id", {attrs}, ...children) */
  function h(sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || "div");
    if (m && m[2]) {
      for (const part of m[2].match(/[.#][\w-]+/g) || []) {
        if (part[0] === ".") el.classList.add(part.slice(1));
        else el.id = part.slice(1);
      }
    }
    if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) {
      kids.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "html") el.innerHTML = v;
        else if (k === "text") el.textContent = v;
        else if (k in el && k !== "list" && typeof v !== "string") el[k] = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    append(el, kids);
    return el;
  }

  function append(el, kids) {
    for (const k of kids) {
      if (k == null || k === false) continue;
      if (Array.isArray(k)) append(el, k);
      else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ───────────── formatting ─────────────
  function usd(v, digits) {
    if (v == null || !Number.isFinite(v)) return "—";
    if (v === 0) return "$0";
    if (digits != null) return "$" + v.toFixed(digits);
    if (v < 0.0001) return "<$0.0001";
    if (v < 0.01) return "$" + v.toFixed(4);
    if (v < 1) return "$" + v.toFixed(3);
    if (v < 1000) return "$" + v.toFixed(2);
    return "$" + Math.round(v).toLocaleString("en-US");
  }

  function tok(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K";
    return String(Math.round(n));
  }

  function bytes(n) {
    if (n >= 1 << 20) return (n / (1 << 20)).toFixed(1) + " MB";
    if (n >= 1 << 10) return (n / (1 << 10)).toFixed(1) + " KB";
    return n + " B";
  }

  function pct(v) {
    return Number.isFinite(v) ? Math.round(v * 100) + "%" : "—";
  }

  const dur = (ms) => AFD.session.fmtDur(ms);

  function clock(t) {
    if (!t) return "";
    const d = new Date(t);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
  }

  function date(t) {
    if (!t) return "";
    return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function dateTime(t) {
    if (!t) return "";
    return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function plural(n, word, pl) {
    return n + " " + (n === 1 ? word : pl || word + "s");
  }

  // ───────────── colors ─────────────
  const CAT_VAR = { read: "--c-read", edit: "--c-edit", run: "--c-run", web: "--c-web", agent: "--c-agent", mcp: "--c-mcp", other: "--c-other" };
  const CAT_LABEL = { read: "Read / search", edit: "Edit / write", run: "Shell", web: "Web", agent: "Subagent", mcp: "MCP", other: "Other" };
  function catColor(cat) {
    return "var(" + (CAT_VAR[cat] || "--c-other") + ")";
  }

  // ───────────── tooltip & toast ─────────────
  let tipEl = null;
  function tip(e, html) {
    if (!tipEl) {
      tipEl = h("div.tip", { role: "tooltip" });
      document.body.appendChild(tipEl);
    }
    if (!html) {
      tipEl.hidden = true;
      return;
    }
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    const pad = 14;
    const r = tipEl.getBoundingClientRect();
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    tipEl.style.left = Math.max(8, x) + "px";
    tipEl.style.top = Math.max(8, y) + "px";
  }
  function hideTip() {
    if (tipEl) tipEl.hidden = true;
  }

  let toastTimer = 0;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = h("div.toast", { role: "status", "aria-live": "polite" });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2400);
  }

  /** Copy text; must be called from a click handler. Falls back to selecting a textarea. */
  async function copyText(text, fallbackEl) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = fallbackEl || h("textarea", { style: { position: "fixed", left: "-9999px", top: "0" } });
        if (!fallbackEl) document.body.appendChild(ta);
        ta.value = text;
        ta.focus();
        ta.select();
        const ok = document.execCommand && document.execCommand("copy");
        if (!fallbackEl) ta.remove();
        return !!ok;
      } catch (e2) {
        return false;
      }
    }
  }

  // ───────────── preferences (best effort) ─────────────
  const PREFIX = "afd:";
  function pref(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }
  function setPref(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable: preferences just won't persist */
    }
  }

  // ───────────── files ─────────────

  /**
   * Collect files from a drop event, walking dropped folders.
   * Returns [{path, file}] with "/"-separated paths that include the dropped folder name.
   */
  async function filesFromDrop(dt) {
    const out = [];
    const items = dt.items ? [...dt.items] : [];
    const entries = items.map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null)).filter(Boolean);
    if (!entries.length) {
      for (const f of dt.files || []) out.push({ path: f.name, file: f });
      return out;
    }
    const walk = async (entry, prefix) => {
      if (entry.isFile) {
        const file = await new Promise((res, rej) => entry.file(res, rej)).catch(() => null);
        if (file) out.push({ path: prefix + entry.name, file });
      } else if (entry.isDirectory) {
        if (SKIP_DIRS.has(entry.name)) {
          out.push({ path: prefix + entry.name + "/", file: null, skippedDir: true });
          return;
        }
        const reader = entry.createReader();
        for (;;) {
          const batch = await new Promise((res) => reader.readEntries(res, () => res([])));
          if (!batch.length) break;
          for (const child of batch) await walk(child, prefix + entry.name + "/");
        }
      }
    };
    for (const entry of entries) await walk(entry, "");
    return out;
  }

  // Huge dependency folders are never useful and can hold 100k+ files; don't even walk them.
  const SKIP_DIRS = new Set(["node_modules", ".git", ".venv", "venv", "__pycache__", ".next", ".turbo", ".gradle", "Pods", "DerivedData", ".cache", "target"]);

  function filesFromInput(input) {
    return [...(input.files || [])]
      .map((f) => ({ path: f.webkitRelativePath || f.name, file: f }))
      .filter((x) => !x.path.split("/").some((p) => SKIP_DIRS.has(p)));
  }

  function readText(file) {
    if (file.text) return file.text();
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
  }

  /** Wire drag-and-drop on an element. onFiles receives [{path, file}]. */
  function dropzone(el, onFiles) {
    let depth = 0;
    el.addEventListener("dragenter", (e) => {
      e.preventDefault();
      depth++;
      el.classList.add("drag");
    });
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });
    el.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (!depth) el.classList.remove("drag");
    });
    el.addEventListener("drop", async (e) => {
      e.preventDefault();
      depth = 0;
      el.classList.remove("drag");
      const files = await filesFromDrop(e.dataTransfer);
      onFiles(files);
    });
  }

  /** Sortable table helper: cols [{key, label, num, render(row)->Node|string, sort(row)->value}] */
  function table(cols, rows, opts) {
    const o = opts || {};
    let sortKey = o.sortKey || null;
    let asc = !!o.asc;
    const wrap = h("div.tbl-wrap" + (o.cls ? "." + o.cls : ""));
    const render = () => {
      clear(wrap);
      const sorted = rows.slice();
      const col = cols.find((c) => c.key === sortKey);
      if (col) {
        const val = col.sort || ((r) => r[col.key]);
        sorted.sort((a, b) => {
          const x = val(a);
          const y = val(b);
          const c = typeof x === "string" ? x.localeCompare(y) : (x || 0) - (y || 0);
          return asc ? c : -c;
        });
      }
      const thead = h("thead", h("tr", cols.map((c) => {
        const th = h("th", { class: (c.num ? "num " : "") + (c.key === sortKey ? "sorted" + (asc ? " asc" : "") : ""), "data-sort": c.sortable === false ? null : c.key, scope: "col" }, c.label);
        if (c.sortable !== false) th.addEventListener("click", () => {
          if (sortKey === c.key) asc = !asc;
          else { sortKey = c.key; asc = !!c.ascFirst; }
          render();
        });
        return th;
      })));
      const tbody = h("tbody", sorted.slice(0, o.limit || 5000).map((r) => {
        const tr = h("tr", { class: o.onRow ? "click" : null }, cols.map((c) => h("td", { class: (c.num ? "num " : "") + (c.cls || "") , title: c.title ? c.title(r) : null }, c.render ? c.render(r) : r[c.key])));
        if (o.onRow) tr.addEventListener("click", () => o.onRow(r));
        return tr;
      }));
      wrap.appendChild(h("table.tbl", thead, tbody));
    };
    render();
    return wrap;
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
    return el;
  }

  const ICONS = {
    play: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8v10.4L12 7z" fill="currentColor"/></svg>',
    pause: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>',
    prev: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2h1.6v10H3zM12 2v10L5.5 7z" fill="currentColor"/></svg>',
    next: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M9.4 2H11v10H9.4zM2 2v10l6.5-5z" fill="currentColor"/></svg>',
    folder: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.5h4.2l1.5 1.6h7.3v8.4h-13z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    file: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 1.5h6l3 3v10h-9z M9.5 1.5v3h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    copy: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M11 5V3a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 2 3v6.5A1.5 1.5 0 0 0 3.5 11H5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    spark: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.6 4.2 4.4.3-3.4 2.8 1.1 4.3L8 10.7l-3.7 2.4 1.1-4.3L2 6l4.4-.3z" fill="currentColor"/></svg>',
    moon: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A5.8 5.8 0 0 1 5.8 2.5a5.8 5.8 0 1 0 7.7 7.7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    sun: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  };

  function icon(name) {
    const s = document.createElement("span");
    s.style.display = "inline-flex";
    s.innerHTML = ICONS[name] || "";
    return s;
  }

  AFD.ui = {
    h, clear, esc, usd, tok, bytes, pct, dur, clock, date, dateTime, plural, catColor, CAT_LABEL, tip, hideTip, toast, copyText,
    pref, setPref, filesFromDrop, filesFromInput, readText, dropzone, table, svgEl, icon, ICONS, SKIP_DIRS,
  };
})(globalThis.AFD = globalThis.AFD || {});
