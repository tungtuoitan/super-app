/* Logic Lens — draw a laid-out flow as SVG (theme-aware through CSS variables with light fallbacks). */
(function (LL) {
  "use strict";

  const { layout, FONT, FAMILY, PAD_Y } = LL.layout;

  // ───────────────────────── SVG ─────────────────────────

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r1 = (v) => Math.round(v * 10) / 10;

  // Colors are CSS variables with light fallbacks: the on-page SVG follows the theme, an exported SVG still looks right.
  const SVG_STYLE = `
  .ll-box{fill:var(--ll-step-bg,#ffffff);stroke:var(--ll-step-line,#1d2a36);stroke-width:1.4}
  .ll-stage,.ll-group{fill:var(--ll-stage-bg,#e4eff6);stroke:var(--ll-stage-line,#3c7fa8);stroke-width:1.4}
  .ll-lane{fill:var(--ll-step-bg,#ffffff);stroke:var(--ll-stage-line,#3c7fa8);stroke-width:1.4}
  .ll-band{fill:var(--ll-stage-line,#3c7fa8)}
  .ll-end{fill:var(--ll-end-bg,#eef1f4);stroke:var(--ll-end-line,#5f6c78);stroke-width:1.4}
  .ll-loop{fill:var(--ll-loop-bg,rgba(60,127,168,.05));stroke:var(--ll-stage-line,#3c7fa8);stroke-width:1.3;stroke-dasharray:2 3}
  .ll-item{fill:var(--ll-step-bg,#ffffff);stroke:var(--ll-item-line,#b8c4ce);stroke-width:1.2}
  .ll-attn{stroke:var(--ll-attn,#c8462f);stroke-dasharray:6 4;stroke-width:1.6}
  .ll-title{font-weight:600;font-size:15px;fill:var(--ll-ink,#16212b)}
  .ll-sub{font-size:12.5px;fill:var(--ll-muted,#6b7884)}
  .ll-itemt{font-weight:500;font-size:13px;fill:var(--ll-ink,#16212b)}
  .ll-note{font-size:12px;fill:var(--ll-attn,#c8462f)}
  .ll-edge{fill:none;stroke:var(--ll-edge,#2a3540);stroke-width:1.5}
  .ll-edge.ll-back{stroke:var(--ll-stage-line,#3c7fa8);stroke-dasharray:4 3}
  .ll-head{fill:var(--ll-edge,#2a3540)}
  .ll-headb{fill:var(--ll-stage-line,#3c7fa8)}
  .ll-qbg{fill:var(--ll-q-bg,#fff7e6);stroke:var(--ll-q-line,#e3b866);stroke-width:1}
  .ll-q{font-size:11.5px;font-weight:500;fill:var(--ll-q-ink,#7a5310)}
  text{font-family:${FAMILY}}
  .ll-node{cursor:pointer}
  .ll-node:focus{outline:none}
  .ll-node:focus-visible .ll-shape,.ll-node.sel .ll-shape{stroke:var(--ll-accent,#d4561b);stroke-width:2.6;stroke-dasharray:none}
  .ll-node.dim,.ll-itemg.dim{opacity:.3}
  .ll-node.hl .ll-shape{filter:drop-shadow(0 0 6px var(--ll-glow,rgba(212,86,27,.45)))}
  `;

  function textLines(b, centerX) {
    const t = [];
    if (b.kind === "item") {
      let yy = b.y + (b.h - (b.titleLines.length * FONT.item.lh + (b.subLines.length ? 2 + b.subLines.length * FONT.sub.lh : 0))) / 2 + FONT.item.size;
      for (const l of b.titleLines) { t.push(`<text class="ll-itemt" x="${centerX}" y="${r1(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.item.lh; }
      yy += 2;
      for (const l of b.subLines) { t.push(`<text class="ll-sub" x="${centerX}" y="${r1(yy - 2)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.sub.lh; }
      return t;
    }
    const textH = b.titleLines.length * FONT.title.lh + (b.subLines.length ? 3 + b.subLines.length * FONT.sub.lh : 0);
    let yy = b.container ? b.y + PAD_Y + FONT.title.size : b.y + (b.h - textH) / 2 + FONT.title.size - 1 + (b.kind === "lane" ? 2 : 0);
    for (const l of b.titleLines) { t.push(`<text class="ll-title" x="${centerX}" y="${r1(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.title.lh; }
    yy += 2;
    for (const l of b.subLines) { t.push(`<text class="ll-sub" x="${centerX}" y="${r1(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.sub.lh; }
    if (b.noteLines && b.noteLines.length) {
      let ny = b.noteY + FONT.note.size;
      for (const l of b.noteLines) { t.push(`<text class="ll-note" x="${centerX}" y="${r1(ny)}" text-anchor="middle">${esc(l)}</text>`); ny += FONT.note.lh; }
    }
    return t;
  }

  /** Render to an SVG string. opts: {interactive, background} */
  function toSvg(flow, lay, opts) {
    const o = opts || {};
    const L = lay || layout(flow);
    const p = [];
    p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" class="ll-svg" role="img" aria-label="${esc(flow.title || "Sơ đồ logic")}">`);
    p.push(`<defs><marker id="ll-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ll-head"/></marker><marker id="ll-arrow-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ll-headb"/></marker><style>${SVG_STYLE}</style></defs>`);
    if (o.background) p.push(`<rect width="100%" height="100%" fill="${esc(o.background)}"/>`);

    const shapeOf = (b) => {
      const cls = { item: "ll-item", group: "ll-group", loop: "ll-loop", stage: "ll-stage", lane: "ll-lane", end: "ll-end" }[b.kind] || "ll-box";
      const rx = b.kind === "end" ? Math.min(b.h / 2, 22) : b.kind === "loop" ? 10 : 6;
      let s = `<rect class="ll-shape ${cls}${b.attention ? " ll-attn" : ""}" x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="${rx}"/>`;
      if (b.kind === "lane") s += `<path class="ll-band" d="M${r1(b.x + 6)} ${r1(b.y + 1)}H${r1(b.x + b.w - 6)}a5 5 0 0 1 5 3v1H${r1(b.x + 1)}v-1a5 5 0 0 1 5-3z"/>`;
      return s;
    };
    const node = (b) => {
      const label = [b.node && b.node.title, b.node && b.node.sub].filter(Boolean).join(": ");
      const tip = b.clipped || b.kind === "item" ? `<title>${esc(b.full || label)}</title>` : "";
      const body = shapeOf(b) + textLines(b, r1(b.x + b.w / 2)).join("") + tip;
      if (b.kind === "item") return `<g class="ll-itemg" data-group="${esc(b.groupId)}"${b.lines ? ` data-lines="${b.lines[0]}-${b.lines[1]}"` : ""}>${body}</g>`;
      return o.interactive ? `<g class="ll-node" data-id="${esc(b.id)}" data-kind="${b.kind}" tabindex="0" role="button" aria-label="${esc(label)}">${body}</g>` : `<g>${body}</g>`;
    };

    // containers first, then edges (so loop bodies' arrows sit on the frame), then boxes and labels
    for (const b of L.boxes) if (b.container) p.push(node(b));
    for (const e of L.edges) p.push(`<path class="ll-edge${e.loop ? " ll-back" : ""}" d="${e.d}"${e.arrow ? ` marker-end="url(#${e.loop ? "ll-arrow-b" : "ll-arrow"})"` : ""}/>`);
    for (const b of L.boxes) if (!b.container) p.push(node(b));
    for (const l of L.labels) p.push(`<g class="ll-qg"><rect class="ll-qbg" x="${r1(l.x)}" y="${r1(l.y)}" width="${r1(l.w)}" height="${l.h}" rx="9"/><text class="ll-q" x="${r1(l.x + 7)}" y="${r1(l.y + 12.5)}">${esc(l.text)}</text>${l.full !== l.text ? `<title>${esc(l.full)}</title>` : ""}</g>`);
    p.push("</svg>");
    return p.join("");
  }

  Object.assign(LL.layout, { toSvg });
})(globalThis.LL = globalThis.LL || {});
