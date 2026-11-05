/* Logic Lens — draw a laid-out flow as SVG. Colors are CSS variables with light fallbacks, so the on-page SVG
 * follows the theme and an exported SVG still looks right on its own. */
(function (LL) {
  "use strict";

  const { layout, FONT, FAMILY, PAD_Y, measure } = LL.layout;
  const CHIP_FONT = { size: 10, weight: 600, lh: 12 };
  const chipW = (text) => measure(text, CHIP_FONT) + text.length * 0.4 + 12; // + letter-spacing .04em

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r1 = (v) => Math.round(v * 10) / 10;

  const SVG_STYLE = `
  text{font-family:${FAMILY}}
  .ll-box{fill:var(--ll-step-bg,#fff);stroke:var(--ll-step-line,#c3ccd5);stroke-width:1.2}
  .ll-stage,.ll-group{fill:var(--ll-stage-bg,#eaf2f8);stroke:var(--ll-stage-line,#8db3cd);stroke-width:1.2}
  .ll-start{fill:var(--ll-start-bg,#1e2935);stroke:var(--ll-start-bg,#1e2935)}
  .ll-end{fill:var(--ll-end-bg,#f1f3f5);stroke:var(--ll-end-line,#97a2ad);stroke-width:1.2}
  .ll-lane{fill:var(--ll-step-bg,#fff);stroke:var(--ll-stage-line,#8db3cd);stroke-width:1.2}
  .ll-plane{fill:var(--ll-step-bg,#fff);stroke:var(--ll-par-line,#a99be6);stroke-width:1.2}
  .ll-band{fill:var(--ll-stage-strong,#3c7fa8)}
  .ll-pband{fill:var(--ll-par,#6d5bd0)}
  .ll-section{fill:var(--ll-section-bg,#f3f5f7);stroke:var(--ll-section-line,#d6dce2);stroke-width:1}
  .ll-sbar{fill:var(--ll-ink,#16212b)}
  .ll-loop{fill:var(--ll-loop-bg,rgba(60,127,168,.04));stroke:var(--ll-stage-line,#8db3cd);stroke-width:1.2;stroke-dasharray:3 4}
  .ll-item{fill:var(--ll-step-bg,#fff);stroke:var(--ll-item-line,#cdd5dc);stroke-width:1}
  .ll-callbar{stroke:var(--ll-step-line,#c3ccd5);stroke-width:1.2}
  .ll-attn{stroke:var(--ll-attn,#c8462f);stroke-opacity:.5;stroke-width:1.3}
  .ll-attnbg{fill:var(--ll-attn,#c8462f)}
  .ll-ch-added{fill:var(--ll-add-bg,#eaf8f0);stroke:var(--ll-add,#1f8a52);stroke-width:2;stroke-dasharray:none}
  .ll-ch-modified{fill:var(--ll-mod-bg,#fff5dd);stroke:var(--ll-mod,#c08400);stroke-width:2;stroke-dasharray:none}
  .ll-ch-removed{fill:var(--ll-del-bg,#fdf0ee);stroke:var(--ll-del,#c8462f);stroke-width:1.5;stroke-dasharray:5 4}
  .ll-loop.ll-cont[class*="ll-ch-"]{fill:var(--ll-loop-bg,rgba(60,127,168,.04))}
  .ll-group.ll-cont[class*="ll-ch-"]{fill:var(--ll-stage-bg,#eaf2f8)}
  .ll-removed>.ll-shape,.ll-removed>text,.ll-removed>path{opacity:.62}
  .ll-removed .ll-title{text-decoration:line-through}
  .ll-title{font-weight:600;font-size:14.5px;fill:var(--ll-ink,#16212b)}
  .ll-start .ll-title,.ll-on-dark{fill:var(--ll-start-ink,#fff)}
  .ll-sub{font-size:12px;fill:var(--ll-muted,#66727e)}
  .ll-on-dark-sub{font-size:12px;fill:var(--ll-start-sub,#b8c4cf)}
  .ll-itemt{font-weight:500;font-size:13px;fill:var(--ll-ink,#16212b)}
  .ll-note{font-size:12px;fill:var(--ll-attn,#c8462f)}
  .ll-cn-modified{fill:var(--ll-mod,#a06d00);font-style:italic} .ll-cn-removed{fill:var(--ll-del,#c8462f);font-style:italic}
  .ll-edge{fill:none;stroke:var(--ll-edge,#7d8996);stroke-width:1.4}
  .ll-edge.ll-del{stroke:var(--ll-del,#c8462f);stroke-dasharray:4 4;opacity:.7}
  .ll-edge.ll-bar{stroke:var(--ll-ink,#16212b);stroke-width:5;stroke-linecap:round}
  .ll-edge.ll-back{stroke:var(--ll-stage-line,#8db3cd);stroke-dasharray:4 3}
  .ll-head{fill:var(--ll-edge,#7d8996)}
  .ll-headb{fill:var(--ll-stage-line,#8db3cd)}
  .ll-chip{font-size:10px;font-weight:600;letter-spacing:.04em}
  .ll-tagbg{fill:var(--ll-tag-bg,#eef1f4);stroke:var(--ll-tag-line,#d3d9df)}
  .ll-tagt{fill:var(--ll-tag-ink,#4b5763)}
  .ll-exit-throw{fill:var(--ll-del,#c8462f)} .ll-exit{fill:var(--ll-muted,#66727e)}
  .ll-cbg-added{fill:var(--ll-add,#1f8a52)} .ll-cbg-modified{fill:var(--ll-mod,#c08400)} .ll-cbg-removed{fill:var(--ll-del,#c8462f)}
  .ll-ct{fill:#fff}
  .ll-qbg{fill:var(--ll-q-bg,#fff6e3);stroke:var(--ll-q-line,#e7c27a);stroke-width:1}
  .ll-q{font-size:11.5px;font-weight:500;fill:var(--ll-q-ink,#7a5310)}
  .ll-pqbg{fill:var(--ll-par-bg,#f1eefc);stroke:var(--ll-par-line,#a99be6);stroke-width:1}
  .ll-pq{font-size:11.5px;font-weight:600;fill:var(--ll-par,#6d5bd0)}
  .ll-qc-added rect{fill:var(--ll-add-bg,#eaf8f0);stroke:var(--ll-add,#1f8a52)} .ll-qc-added text{fill:var(--ll-add,#1f8a52);font-weight:600}
  .ll-qc-modified rect{fill:var(--ll-mod-bg,#fff5dd);stroke:var(--ll-mod,#c08400)} .ll-qc-modified text{fill:var(--ll-mod,#a06d00);font-weight:600}
  .ll-qc-removed rect{fill:var(--ll-del-bg,#fdf0ee);stroke:var(--ll-del,#c8462f)} .ll-qc-removed text{fill:var(--ll-del,#c8462f);text-decoration:line-through}
  .ll-callic{font-size:13px;fill:var(--ll-muted,#66727e)}
  .ll-node{cursor:pointer}
  .ll-node:focus{outline:none}
  .ll-node:hover .ll-shape{filter:brightness(.985)}
  .ll-node:focus-visible .ll-shape,.ll-node.sel .ll-shape{stroke:var(--ll-accent,#2563eb);stroke-width:2.6;stroke-dasharray:none}
  .ll-node.dim,.ll-itemg.dim{opacity:.28}
  .ll-node.hl .ll-shape{filter:drop-shadow(0 0 7px var(--ll-glow,rgba(37,99,235,.35)))}
  .ll-shadow{filter:drop-shadow(0 1px 1.5px rgba(16,24,40,.07))}
  `;

  /** Turn an orthogonal M/V/H path into one with rounded corners. */
  function roundPath(d, radius) {
    const pts = [];
    let x = 0;
    let y = 0;
    const re = /([MVHL])\s*([-\d.]+)(?:\s+([-\d.]+))?/g;
    let m;
    while ((m = re.exec(d))) {
      if (m[1] === "M" || m[1] === "L") { x = +m[2]; y = +m[3]; }
      else if (m[1] === "V") y = +m[2];
      else x = +m[2];
      const last = pts[pts.length - 1];
      if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
    }
    if (pts.length < 3) return d;
    let out = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const [nx, ny] = pts[i + 1];
      const rIn = Math.min(radius, Math.hypot(cx - px, cy - py) / 2);
      const rOut = Math.min(radius, Math.hypot(nx - cx, ny - cy) / 2);
      const rr = Math.min(rIn, rOut);
      const ax = cx - Math.sign(cx - px) * rr;
      const ay = cy - Math.sign(cy - py) * rr;
      const bx = cx + Math.sign(nx - cx) * rr;
      const by = cy + Math.sign(ny - cy) * rr;
      out += `L${r1(ax)} ${r1(ay)}Q${r1(cx)} ${r1(cy)} ${r1(bx)} ${r1(by)}`;
    }
    const lp = pts[pts.length - 1];
    return out + `L${r1(lp[0])} ${r1(lp[1])}`;
  }

  const CHANGE_LABEL = { added: "+ MỚI", modified: "~ SỬA", removed: "− XOÁ" };
  const EXIT_LABEL = { return: "RETURN", throw: "THROW", break: "BREAK", continue: "CONTINUE", exit: "EXIT", respond: "RESPOND" };

  function chip(x, y, text, bgClass, textClass) {
    const w = chipW(text);
    return `<g class="ll-chipg"><rect class="${bgClass}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="15" rx="7.5"/><text class="ll-chip ${textClass}" x="${r1(x + w / 2)}" y="${r1(y + 11)}" text-anchor="middle">${esc(text)}</text></g>`;
  }

  function textLines(b) {
    const t = [];
    const dark = b.kind === "start";
    if (b.kind === "item") {
      const cx = r1(b.x + b.w / 2);
      let yy = b.y + (b.h - (b.titleLines.length * FONT.item.lh + (b.subLines.length ? 2 + b.subLines.length * FONT.sub.lh : 0))) / 2 + FONT.item.size;
      for (const l of b.titleLines) { t.push(`<text class="ll-itemt" x="${cx}" y="${r1(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.item.lh; }
      yy += 2;
      for (const l of b.subLines) { t.push(`<text class="ll-sub" x="${cx}" y="${r1(yy - 2)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.sub.lh; }
      return t;
    }
    // section headers read left-aligned, like a heading; everything else is centered
    const left = b.kind === "section";
    const tx = left ? r1(b.x + 18) : r1(b.x + b.w / 2);
    const anchor = left ? "start" : "middle";
    const extra = b.node && (b.node.tag || b.node.change) && !b.container ? 4 : 0;
    const noteH = b.noteKind ? 6 + b.noteLines.length * FONT.note.lh : 0;
    const textH = b.titleLines.length * FONT.title.lh + (b.subLines.length ? 3 + b.subLines.length * FONT.sub.lh : 0);
    let yy = b.container ? b.y + PAD_Y + FONT.title.size : b.y + extra + (b.h - noteH - extra - textH) / 2 + FONT.title.size - 1 + (b.kind === "lane" || b.kind === "plane" ? 2 : 0);
    for (const l of b.titleLines) { t.push(`<text class="ll-title${dark ? " ll-on-dark" : ""}" x="${tx}" y="${r1(yy)}" text-anchor="${anchor}">${esc(l)}</text>`); yy += FONT.title.lh; }
    yy += 2;
    for (const l of b.subLines) { t.push(`<text class="${dark ? "ll-on-dark-sub" : "ll-sub"}" x="${tx}" y="${r1(yy)}" text-anchor="${anchor}">${esc(l)}</text>`); yy += FONT.sub.lh; }
    if (b.noteLines && b.noteLines.length) {
      let ny = b.noteY + FONT.note.size;
      for (const l of b.noteLines) { t.push(`<text class="ll-note${b.noteKind ? " ll-cn-" + b.noteKind : ""}" x="${r1(b.x + b.w / 2)}" y="${r1(ny)}" text-anchor="middle">${esc(l)}</text>`); ny += FONT.note.lh; }
    }
    return t;
  }

  function shapeOf(b) {
    const base = { item: "ll-item", group: "ll-group", loop: "ll-loop", stage: "ll-stage", lane: "ll-lane", plane: "ll-plane", end: "ll-end", start: "ll-start", section: "ll-section" }[b.kind] || "ll-box";
    const change = b.change ? " ll-ch-" + b.change : "";
    const attn = b.attention && !b.change ? " ll-attn" : "";
    const cont = b.container ? " ll-cont" : "";
    const pill = b.kind === "end" || b.kind === "start";
    const rx = pill ? Math.min(b.h / 2, 22) : b.kind === "loop" ? 12 : b.kind === "section" ? 8 : 10;
    const shadow = !b.container && b.kind !== "section" ? " ll-shadow" : "";
    let s = `<rect class="ll-shape ${base}${cont}${change}${attn}${shadow}" x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="${rx}"/>`;
    if (b.kind === "lane" || b.kind === "plane") s += `<path class="${b.kind === "plane" ? "ll-pband" : "ll-band"}" d="M${r1(b.x + 8)} ${r1(b.y + 0.6)}H${r1(b.x + b.w - 8)}a6 6 0 0 1 6 3.4v.6H${r1(b.x + 2)}v-.6a6 6 0 0 1 6-3.4z"/>`;
    if (b.kind === "section") s += `<rect class="ll-sbar" x="${r1(b.x)}" y="${r1(b.y + 8)}" width="4" height="${r1(b.h - 16)}" rx="2"/>`;
    if (b.kind === "call") s += `<text class="ll-callic" x="${r1(b.x + b.w - 12)}" y="${r1(b.y + b.h - 9)}" text-anchor="end">↗</text>`; // calls another function
    // chips sit on the top edge: the change (left), the exit kind (left on end boxes), the effect tag (right)
    const n = b.node || {};
    if (b.change) s += chip(b.x + 10, b.y - 7.5, CHANGE_LABEL[b.change], "ll-cbg-" + b.change, "ll-ct");
    else if (b.kind === "end" && n.exit && n.exit !== "return") s += chip(b.x + 14, b.y - 7.5, EXIT_LABEL[n.exit] || n.exit.toUpperCase(), "ll-tagbg", n.exit === "throw" ? "ll-exit-throw" : "ll-exit");
    let right = b.x + b.w - 10;
    if (b.attention && b.kind !== "item") { // "!" badge: worth a look (kept apart from the red of removed code)
      s += `<g class="ll-chipg"><title>Đáng chú ý</title><circle class="ll-attnbg" cx="${r1(right - 7.5)}" cy="${r1(b.y)}" r="7.5"/><text class="ll-chip ll-ct" x="${r1(right - 7.5)}" y="${r1(b.y + 3.6)}" text-anchor="middle">!</text></g>`;
      right -= 19;
    }
    if (n.tag) { const w = chipW(n.tag); s += chip(right - w, b.y - 7.5, n.tag, "ll-tagbg", "ll-tagt"); }
    return s;
  }

  /** Render to an SVG string. opts: {interactive, background} */
  function toSvg(flow, lay, opts) {
    const o = opts || {};
    const L = lay || layout(flow);
    const p = [];
    p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" class="ll-svg" role="img" aria-label="${esc(flow.title || "Sơ đồ logic")}">`);
    p.push(`<defs><marker id="ll-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ll-head"/></marker><marker id="ll-arrow-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ll-headb"/></marker><style>${SVG_STYLE}</style></defs>`);
    if (o.background) p.push(`<rect width="100%" height="100%" fill="${esc(o.background)}"/>`);

    const node = (b) => {
      const n = b.node || {};
      const label = [n.title, n.sub, b.change ? CHANGE_LABEL[b.change] : ""].filter(Boolean).join(": ");
      const tip = b.clipped || b.kind === "item" ? `<title>${esc(b.full || label)}</title>` : "";
      const body = shapeOf(b) + textLines(b).join("") + tip;
      const removed = b.change === "removed" ? " ll-removed" : "";
      if (b.kind === "item") return `<g class="ll-itemg${removed}" data-group="${esc(b.groupId)}"${b.lines ? ` data-lines="${b.lines[0]}-${b.lines[1]}"` : ""}>${body}</g>`;
      return o.interactive
        ? `<g class="ll-node${removed}" data-id="${esc(b.id)}" data-kind="${b.kind}"${b.change ? ` data-change="${b.change}"` : ""} tabindex="0" role="button" aria-label="${esc(label)}">${body}</g>`
        : `<g class="${removed.trim()}">${body}</g>`;
    };

    // containers first, then edges (so loop bodies' arrows sit on the frame), then boxes and labels
    const depth = (b) => String(b.id).split(".").length;
    for (const b of L.boxes.filter((x) => x.container).sort((a, c) => depth(a) - depth(c))) p.push(node(b));
    for (const e of L.edges) {
      const cls = "ll-edge" + (e.loop ? " ll-back" : "") + (e.removed ? " ll-del" : "") + (e.bar ? " ll-bar" : "");
      const marker = e.arrow ? ` marker-end="url(#${e.loop ? "ll-arrow-b" : "ll-arrow"})"` : "";
      p.push(`<path class="${cls}" d="${e.bar ? e.d : roundPath(e.d, 7)}"${marker}/>`);
    }
    for (const b of L.boxes) if (!b.container) p.push(node(b));
    for (const l of L.labels) p.push(`<g class="ll-qg${l.change ? " ll-qc-" + l.change : ""}"><rect class="${l.parallel ? "ll-pqbg" : "ll-qbg"}" x="${r1(l.x)}" y="${r1(l.y)}" width="${r1(l.w)}" height="${l.h}" rx="9"/><text class="${l.parallel ? "ll-pq" : "ll-q"}" x="${r1(l.x + 7)}" y="${r1(l.y + 12.5)}">${esc(l.text)}</text>${l.full !== l.text ? `<title>${esc(l.full)}</title>` : ""}</g>`);
    p.push("</svg>");
    return p.join("");
  }

  Object.assign(LL.layout, { toSvg, roundPath });
})(globalThis.LL = globalThis.LL || {});
