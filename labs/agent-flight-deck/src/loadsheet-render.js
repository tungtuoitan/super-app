/* Agent Flight Deck — Load Sheet rendering: weight & balance, treemap, manifest table, prompt preview and costs. */
(function (AFD) {
  "use strict";

  const { h, clear, esc, usd, tok, plural } = AFD.ui;
  const P = () => AFD.packer;
  const L = (AFD.ls = AFD.ls || {});
  const S = L.S;
  const { LANG_COLOR, LANG_NAME, PRICE_MODELS } = L;
  const TREEMAP_MAX_CELLS = 1200;

  // ───────────────────────── rendering ─────────────────────────

  function renderAll() {
    const el = S.el;
    if (!el.budget) return;
    el.budget.value = String(S.budget);
    if (!el.budget.value) {
      el.budget.appendChild(h("option", { value: String(S.budget) }, tok(S.budget)));
      el.budget.value = String(S.budget);
    }
    el.reserve.value = String(S.reserve);
    for (const k of Object.keys(S.opts)) {
      const box = document.getElementById("ls-opt-" + k);
      if (box) box.checked = S.opts[k];
    }
    [...el.formatSeg.children].forEach((c, i) => c.setAttribute("aria-pressed", String(["xml", "markdown", "plain"][i] === S.format)));
    S.prompt = L.build();
    el.projTitle.textContent = S.projectName ? S.projectName : "Cargo map";
    renderWB();
    renderTreemap();
    renderManifest();
    renderPrompt();
  }

  function renderWB() {
    const el = S.el;
    const used = S.prompt.tokens;
    const cap = L.capacity();
    const over = used > cap;
    const scale = Math.max(S.budget, used);
    el.wbBig.innerHTML = `${esc(tok(used))} <span style="font-size:14px;color:var(--muted);font-weight:500">/ ${esc(tok(cap))}</span>`;
    el.wbStatus.textContent = over ? `Over by ${tok(used - cap)}` : `${tok(cap - used)} free`;
    el.wbStatus.className = "wb-status " + (over ? "over" : "ok");
    el.wbBar.innerHTML = "";
    el.wbBar.appendChild(h("div.payload", { style: { width: Math.min(100, (used / scale) * 100) + "%", background: over ? "var(--bad)" : "var(--ink)" } }));
    if (S.reserve) el.wbBar.appendChild(h("div.reserve", { style: { left: (cap / scale) * 100 + "%", width: (S.reserve / scale) * 100 + "%" } }));
    el.wbBar.setAttribute("aria-label", `Prompt uses ${tok(used)} of ${tok(cap)} tokens`);
    const totalAll = S.files.reduce((a, f) => a + P().packedTokens(f, S.opts), 0);
    el.wbLegend.innerHTML = `<span><i class="swatch" style="background:var(--ink)"></i> Prompt ${esc(plural(S.prompt.files, "file"))}</span>` +
      (S.reserve ? `<span><i class="swatch" style="background:var(--warn)"></i> Reply ${esc(tok(S.reserve))}</span>` : "") +
      `<span>Whole project ${esc(tok(totalAll))}</span>`;
  }

  function renderTreemap() {
    const el = S.el;
    const box = el.treemap;
    if (!box.isConnected) return;
    clear(box);
    const W = box.clientWidth || 600;
    const H = box.clientHeight || 340;
    let items = S.files.map((f) => ({ value: Math.max(1, P().packedTokens(f, S.opts)), f }));
    items.sort((a, b) => b.value - a.value);
    let rest = null;
    if (items.length > TREEMAP_MAX_CELLS) {
      const tail = items.slice(TREEMAP_MAX_CELLS);
      items = items.slice(0, TREEMAP_MAX_CELLS);
      rest = { value: tail.reduce((a, x) => a + x.value, 0), rest: tail.length };
      items.push(rest);
    }
    const rects = P().squarify(items, 0, 0, W, H);
    const langs = new Map();
    for (const r of rects) {
      const f = r.item.f;
      if (!f) {
        box.appendChild(h("div.tm-cell", { style: { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", background: "var(--c-other)", cursor: "default" } }, h("span", `${r.item.rest} smaller files`)));
        continue;
      }
      langs.set(f.lang, (langs.get(f.lang) || 0) + r.item.value);
      const cell = h("div.tm-cell" + (f.include ? "" : ".off"), {
        style: { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", background: LANG_COLOR[f.lang] || LANG_COLOR.other },
        role: "button", tabindex: r.w > 30 && r.h > 18 ? "0" : "-1", "aria-pressed": String(f.include), "aria-label": `${f.path}, ${tok(r.item.value)} tokens`,
      });
      if (r.w > 46 && r.h > 16) cell.appendChild(h("span", f.path.split("/").pop()));
      if (r.w > 46 && r.h > 30) cell.appendChild(h("small", tok(r.item.value)));
      const toggle = () => { f.include = !f.include; renderAll(); };
      cell.addEventListener("click", toggle);
      cell.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      cell.addEventListener("pointermove", (e) => AFD.ui.tip(e, `<b>${esc(f.path)}</b>\n${esc(tok(r.item.value))} tokens · ${esc(String(f.lines))} lines${f.score > 0 ? `\nrelevance ${f.score.toFixed(2)}` : ""}\n${f.include ? "Loaded · click to unload" : "Not loaded · click to load"}`));
      cell.addEventListener("pointerleave", AFD.ui.hideTip);
      box.appendChild(cell);
    }
    if (!S.files.length) box.appendChild(h("div", { style: { padding: "20px", color: "var(--muted)" } }, "No readable text files."));
    const totalAll = S.files.reduce((a, f) => a + P().packedTokens(f, S.opts), 0);
    el.tmTitle.textContent = `${plural(S.files.length, "file")} · ${tok(totalAll)} tokens${S.isExample ? " · example project" : ""}`;
    el.tmLegend.innerHTML = [...langs.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => `<span><i class="swatch" style="background:${LANG_COLOR[l] || LANG_COLOR.other}"></i>${esc(LANG_NAME[l] || l)} ${esc(tok(v))}</span>`).join("") +
      `<span><i class="swatch" style="background:var(--line);background-image:repeating-linear-gradient(-45deg,transparent,transparent 2px,var(--faint) 2px,var(--faint) 3px)"></i>Not loaded</span>`;
  }

  function renderManifest() {
    const el = S.el;
    clear(el.manifest);
    const rows = L.shownFiles();
    const loaded = S.files.filter((f) => f.include).length;
    el.manifestCount.textContent = `${loaded} of ${S.files.length} loaded`;
    const maxScore = Math.max(...S.files.map((f) => f.score), 0);
    const hasScore = maxScore > 0;
    const cols = [
      { key: "include", label: "", sortable: false, render: (r) => {
        const box = h("input", { type: "checkbox", checked: r.include, "aria-label": "Load " + r.path });
        box.addEventListener("click", (e) => e.stopPropagation());
        box.addEventListener("change", () => { r.include = box.checked; renderAll(); });
        return box;
      } },
      { key: "path", label: "File", render: (r) => h("div.path", { title: r.secretHint ? r.path + " — looks like it contains a key or token; check before sending it to a model" : r.path }, h("bdi", (r.secretHint ? "⚠ " : "") + r.path)), ascFirst: true },
      { key: "lang", label: "Type", render: (r) => h("span", { style: { display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" } }, h("i.swatch", { style: { background: LANG_COLOR[r.lang] || LANG_COLOR.other } }), LANG_NAME[r.lang] || r.lang) },
      { key: "tokens", label: "≈Tokens", num: true, render: (r) => tok(P().packedTokens(r, S.opts)), sort: (r) => P().packedTokens(r, S.opts) },
    ];
    if (hasScore) cols.push({ key: "score", label: "Relevance", render: (r) => h("span", { title: r.score.toFixed(2) }, h("i.score", { style: { width: Math.max(2, (r.score / maxScore) * 70) + "px", opacity: r.score > 0 ? 1 : 0.2 } })) });
    el.manifest.appendChild(AFD.ui.table(cols, rows, { sortKey: hasScore ? "score" : "tokens", onRow: (r) => { r.include = !r.include; renderAll(); }, limit: 3000 }));
  }

  function renderPrompt() {
    const el = S.el;
    const p = S.prompt;
    const text = p.text;
    el.promptStats.textContent = `${plural(p.files, "file")} · ≈${tok(p.tokens)} tokens · ${text.length.toLocaleString("en-US")} chars`;
    const HEAD = 6000;
    const TAIL = 1500;
    el.preview.textContent = p.files
      ? text.length > HEAD + TAIL + 200
        ? text.slice(0, HEAD) + `\n\n  ⋯ ${(text.length - HEAD - TAIL).toLocaleString("en-US")} characters not shown here; Copy prompt copies everything ⋯\n\n` + text.slice(-TAIL)
        : text
      : "Load some files to build the prompt.";
    el.copyBtn.disabled = !p.files;

    clear(el.costs);
    el.costs.appendChild(h("span.h", "Input cost of this prompt"));
    el.costs.appendChild(h("span.h.num", "First send"));
    el.costs.appendChild(h("span.h.num", { title: "Each later request that reuses the same prompt prefix from the prompt cache" }, "Cached re-send"));
    for (const m of PRICE_MODELS) {
      const c = AFD.pricing.promptCost(p.tokens, m);
      if (!c) continue;
      el.costs.appendChild(h("span", AFD.pricing.displayName(m)));
      el.costs.appendChild(h("span.num", usd(c.first)));
      el.costs.appendChild(h("span.num", usd(c.reread)));
    }

    clear(el.skipped);
    if (S.skipped.length) {
      const groups = new Map();
      for (const s of S.skipped) {
        if (!groups.has(s.reason)) groups.set(s.reason, []);
        groups.get(s.reason).push(s);
      }
      el.skipped.appendChild(h("summary", `${plural(S.skipped.length, "file")} left out: ` + [...groups.entries()].map(([r, list]) => `${list.length} ${r}`).join(", ")));
      el.skipped.appendChild(h("ul", S.skipped.slice(0, 400).map((s) => h("li", `${s.path}  (${s.reason})`))));
    }
  }

  Object.assign(L, { renderAll, renderManifest, renderPrompt, renderTreemap, renderWB });
})(globalThis.AFD = globalThis.AFD || {});
