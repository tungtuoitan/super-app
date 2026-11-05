/* Logic Lens — lay a Flow out top-to-bottom and draw it as SVG.
 * Pure apart from text measurement, which is injected (canvas in the browser, an estimate in Node).
 */
(function (LL) {
  "use strict";

  const W = 880; // drawing width in SVG units; the SVG scales to its container
  const FONT = {
    title: { size: 15, weight: 600, lh: 19 },
    sub: { size: 12.5, weight: 400, lh: 16 },
    item: { size: 13, weight: 500, lh: 17 },
    note: { size: 12, weight: 400, lh: 16 },
  };
  const PAD_X = 16;
  const PAD_Y = 10;
  const GAP = 30; // vertical space between boxes (arrow length)
  const BUS = 18; // fork / merge bus offset
  const LANE_GAP = 16;
  const FAMILY = '"Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, sans-serif';

  // ───────────────────────── measurement ─────────────────────────

  let measureFn = null;
  /** Use a canvas to measure text in the browser; falls back to an estimate. */
  function setMeasure(fn) {
    measureFn = fn;
  }
  function browserMeasure() {
    if (typeof document === "undefined") return null;
    const ctx = document.createElement("canvas").getContext("2d");
    const cache = new Map();
    return (text, f) => {
      const key = f.weight + "|" + f.size + "|" + text;
      let v = cache.get(key);
      if (v == null) {
        ctx.font = `${f.weight} ${f.size}px ${FAMILY}`;
        v = ctx.measureText(text).width;
        if (cache.size > 5000) cache.clear();
        cache.set(key, v);
      }
      return v;
    };
  }
  function estimate(text, f) {
    let w = 0;
    for (const ch of text) w += /[ilI.,:;'|!]/.test(ch) ? 0.3 : /[mwMW@]/.test(ch) ? 0.85 : /[A-Z0-9]/.test(ch) ? 0.66 : 0.55;
    return w * f.size * (f.weight >= 600 ? 1.05 : 1);
  }
  const measure = (text, f) => (measureFn || estimate)(text, f);

  /** Greedy word wrap; very long words are split. Returns lines (at most maxLines, last one ellipsized). */
  function wrap(text, f, maxW, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const out = [];
    let cur = "";
    const push = (s) => out.push(s);
    for (let word of words) {
      while (measure(word, f) > maxW && word.length > 1) {
        // split an over-long word
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut), f) > maxW) cut--;
        if (cur) { push(cur); cur = ""; }
        push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = cur ? cur + " " + word : word;
      if (measure(next, f) <= maxW) cur = next;
      else { if (cur) push(cur); cur = word; }
    }
    if (cur) push(cur);
    if (maxLines && out.length > maxLines) {
      const kept = out.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last.length > 1 && measure(last + "…", f) > maxW) last = last.slice(0, -1);
      kept[maxLines - 1] = last + "…";
      return kept;
    }
    return out;
  }

  // ───────────────────────── layout ─────────────────────────

  /**
   * Lay out a flow. Returns {width, height, boxes, edges, groups} in SVG units.
   * boxes: {id, x, y, w, h, kind, attention, titleLines, subLines, lane?, item?, groupId?}
   * edges: {d, arrow}
   */
  function layout(flow) {
    const boxes = [];
    const edges = [];
    const containers = [];
    const top = 16;

    // a simple box (step/stage/lane head/group item); returns its height for a given width
    const textBlock = (node, w, f1, f2) => {
      const inner = w - PAD_X * 2;
      const titleLines = wrap(node.title || "", f1 || FONT.title, inner, 3);
      const subLines = node.sub ? wrap(node.sub, f2 || FONT.sub, inner, 3) : [];
      const h = PAD_Y * 2 + titleLines.length * (f1 || FONT.title).lh + (subLines.length ? 3 + subLines.length * (f2 || FONT.sub).lh : 0);
      return { titleLines, subLines, h: Math.max(h, subLines.length ? 52 : 40) };
    };

    /** Lay out a sequence starting at (x..x+w, y). Returns {bottom, firstTop: {x,y}|null, lastBottoms: [{x,y}], isEmpty}. */
    function seq(list, x, w, y, path, depth, from) {
      let cursor = y;
      let prev = from || null; // [{x, y}] bottoms to connect from
      let firstTop = null;
      list.forEach((node, i) => {
        const id = path + i;
        if (node.kind === "branch") {
          const n = node.lanes.length;
          const laneW = (w - LANE_GAP * (n - 1)) / n;
          const centers = node.lanes.map((_, j) => x + j * (laneW + LANE_GAP) + laneW / 2);
          let laneTop = cursor;
          if (prev) {
            const busY = cursor - GAP + BUS;
            // from the previous box(es) down to the fork bus
            const from = prev.length === 1 ? prev[0] : null;
            if (from) edges.push({ d: `M${from.x} ${from.y}V${busY}`, arrow: false });
            else for (const p of prev) edges.push({ d: `M${p.x} ${p.y}V${busY}`, arrow: false });
            const xs = centers.concat(prev.map((p) => p.x));
            if (n > 1 || prev.some((p) => Math.abs(p.x - centers[0]) > 0.5)) edges.push({ d: `M${Math.min(...xs)} ${busY}H${Math.max(...xs)}`, arrow: false });
            for (const c of centers) edges.push({ d: `M${c} ${busY}V${laneTop}`, arrow: true });
          }
          const bottoms = [];
          let maxBottom = laneTop;
          node.lanes.forEach((lane, j) => {
            const lid = id + ".l" + j;
            const lx = x + j * (laneW + LANE_GAP);
            const bw = Math.min(laneW, Math.max(140, laneW));
            const tb = textBlock(lane, bw);
            boxes.push({ id: lid, x: lx + (laneW - bw) / 2, y: laneTop, w: bw, h: tb.h, kind: "stage", attention: lane.attention, titleLines: tb.titleLines, subLines: tb.subLines, lane: true, node: lane });
            let lb = [{ x: centers[j], y: laneTop + tb.h }];
            let bottom = laneTop + tb.h;
            if (lane.steps.length) {
              const r = seq(lane.steps, lx, laneW, bottom + GAP, lid + ".", depth + 1, [{ x: centers[j], y: bottom }]);
              lb = r.lastBottoms;
              bottom = r.bottom;
            }
            bottoms.push(lb);
            maxBottom = Math.max(maxBottom, bottom);
          });
          if (!firstTop) firstTop = { x: centers[0], y: laneTop };
          // merge: drop each lane's tail to a shared bus; the next box connects from the bus center
          const mergeY = maxBottom + BUS;
          const isLast = i === list.length - 1;
          if (!isLast || depth > 1) {
            for (const lb of bottoms) for (const p of lb) edges.push({ d: `M${p.x} ${p.y}V${mergeY}`, arrow: false });
            const xs = bottoms.flat().map((p) => p.x);
            if (xs.length > 1) edges.push({ d: `M${Math.min(...xs)} ${mergeY}H${Math.max(...xs)}`, arrow: false });
            prev = [{ x: x + w / 2, y: mergeY }];
            cursor = mergeY + GAP - BUS + 6;
            // connector from the merge bus center to the next box is drawn by the next box; mark it
            prev.merge = true;
          } else {
            prev = bottoms.flat();
            cursor = maxBottom;
          }
          return;
        }

        if (node.kind === "group") {
          const gw = depth === 1 ? w : w;
          const gx = x + (w - gw) / 2;
          const head = textBlock(node, gw);
          // item boxes laid out in rows
          const inner = gw - PAD_X * 2;
          const items = (node.items || []).map((it) => {
            const tw = Math.max(measure(it.title, FONT.item), it.sub ? measure(it.sub, FONT.sub) : 0);
            const iw = Math.min(inner, Math.max(110, tw + 28));
            const tl = wrap(it.title, FONT.item, iw - 24, 2);
            const sl = it.sub ? wrap(it.sub, FONT.sub, iw - 24, 2) : [];
            const ih = 16 + tl.length * FONT.item.lh + (sl.length ? 2 + sl.length * FONT.sub.lh : 0);
            return { it, w: iw, h: Math.max(ih, 40), tl, sl };
          });
          const rows = [];
          let row = [];
          let rw = 0;
          for (const it of items) {
            if (row.length && rw + 12 + it.w > inner) { rows.push(row); row = []; rw = 0; }
            rw += (row.length ? 12 : 0) + it.w;
            row.push(it);
          }
          if (row.length) rows.push(row);
          // equalize heights within a row
          let gy = cursor;
          let yy = gy + PAD_Y + head.titleLines.length * FONT.title.lh + (head.subLines.length ? 3 + head.subLines.length * FONT.sub.lh : 0) + 12;
          const itemBoxes = [];
          for (const r of rows) {
            const rh = Math.max(...r.map((q) => q.h));
            const total = r.reduce((a, q) => a + q.w, 0) + 12 * (r.length - 1);
            let xx = gx + (gw - total) / 2;
            for (const q of r) {
              itemBoxes.push({ id: id + ".i" + itemBoxes.length, x: xx, y: yy, w: q.w, h: rh, kind: "item", titleLines: q.tl, subLines: q.sl, item: true, groupId: id });
              xx += q.w + 12;
            }
            yy += rh + 10;
          }
          const noteLines = node.note ? wrap(node.note, FONT.note, inner, 3) : [];
          if (noteLines.length) yy += 2 + noteLines.length * FONT.note.lh;
          const gh = yy - gy + (rows.length || noteLines.length ? 6 : 0) + PAD_Y - 4;
          boxes.push({ id, x: gx, y: gy, w: gw, h: Math.max(gh, head.h), kind: "group", attention: node.attention, titleLines: head.titleLines, subLines: head.subLines, noteLines, node, noteY: yy - noteLines.length * FONT.note.lh });
          for (const b of itemBoxes) boxes.push(b);
          connect({ x: x + w / 2, y: gy });
          prev = [{ x: x + w / 2, y: gy + Math.max(gh, head.h) }];
          cursor = gy + Math.max(gh, head.h) + GAP;
          return;
        }

        // step / stage
        const maxW = depth === 1 ? Math.min(w, Math.max(340, w * 0.56)) : w - 8;
        const tb = textBlock(node, maxW);
        const bx = x + (w - maxW) / 2;
        boxes.push({ id, x: bx, y: cursor, w: maxW, h: tb.h, kind: node.kind, attention: node.attention, titleLines: tb.titleLines, subLines: tb.subLines, node });
        connect({ x: x + w / 2, y: cursor });
        prev = [{ x: x + w / 2, y: cursor + tb.h }];
        cursor += tb.h + GAP;
      });

      function connect(to) {
        if (!firstTop) firstTop = to;
        if (!prev) return;
        if (prev.merge) {
          edges.push({ d: `M${prev[0].x} ${prev[0].y}V${to.y}`, arrow: true });
        } else if (prev.length === 1) {
          edges.push({ d: `M${prev[0].x} ${prev[0].y}V${to.y}`, arrow: true });
        } else {
          const busY = to.y - BUS;
          for (const p of prev) edges.push({ d: `M${p.x} ${p.y}V${busY}`, arrow: false });
          const xs = prev.map((p) => p.x).concat([to.x]);
          edges.push({ d: `M${Math.min(...xs)} ${busY}H${Math.max(...xs)}`, arrow: false });
          edges.push({ d: `M${to.x} ${busY}V${to.y}`, arrow: true });
        }
      }

      const lastBottoms = prev || [];
      const bottom = list.length ? Math.max(...lastBottoms.map((p) => p.y), y) : y;
      return { bottom, firstTop: firstTop || { x: x + w / 2, y }, lastBottoms };
    }

    const margin = 20;
    const r = seq(flow.steps, margin, W - margin * 2, top, "", 1);
    const height = Math.ceil(r.bottom + 20);
    return { width: W, height, boxes, edges, containers };
  }

  // ───────────────────────── SVG ─────────────────────────

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Colors are CSS variables with light fallbacks, so the on-page SVG follows the theme and an exported SVG still looks right.
  const SVG_STYLE = `
  .ll-box{fill:var(--ll-step-bg,#ffffff);stroke:var(--ll-step-line,#1d2a36);stroke-width:1.4}
  .ll-stage{fill:var(--ll-stage-bg,#e4eff6);stroke:var(--ll-stage-line,#3c7fa8);stroke-width:1.4}
  .ll-group{fill:var(--ll-stage-bg,#e4eff6);stroke:var(--ll-stage-line,#3c7fa8);stroke-width:1.4}
  .ll-item{fill:var(--ll-step-bg,#ffffff);stroke:var(--ll-item-line,#b8c4ce);stroke-width:1.2}
  .ll-attn{stroke:var(--ll-attn,#c8462f);stroke-dasharray:6 4;stroke-width:1.6}
  .ll-title{font-weight:600;font-size:15px;fill:var(--ll-ink,#16212b)}
  .ll-sub{font-size:12.5px;fill:var(--ll-muted,#6b7884)}
  .ll-itemt{font-weight:500;font-size:13px;fill:var(--ll-ink,#16212b)}
  .ll-note{font-size:12px;fill:var(--ll-attn,#c8462f)}
  .ll-edge{fill:none;stroke:var(--ll-edge,#2a3540);stroke-width:1.5}
  .ll-head{fill:var(--ll-edge,#2a3540)}
  text{font-family:${FAMILY}}
  .ll-node{cursor:pointer}
  .ll-node:focus{outline:none}
  .ll-node:focus-visible .ll-shape,.ll-node.sel .ll-shape{stroke:var(--ll-accent,#d4561b);stroke-width:2.6;stroke-dasharray:none}
  .ll-node.dim{opacity:.32}
  .ll-node.hl .ll-shape{filter:drop-shadow(0 0 6px var(--ll-glow,rgba(212,86,27,.45)))}
  `;

  /** Render to an SVG string. opts: {interactive, background} */
  function toSvg(flow, lay, opts) {
    const o = opts || {};
    const L = lay || layout(flow);
    const p = [];
    p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" class="ll-svg" role="img" aria-label="${esc(flow.title || "Sơ đồ logic")}">`);
    p.push(`<defs><marker id="ll-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ll-head"/></marker><style>${SVG_STYLE}</style></defs>`);
    if (o.background) p.push(`<rect width="100%" height="100%" fill="${esc(o.background)}"/>`);
    for (const e of L.edges) p.push(`<path class="ll-edge" d="${e.d}"${e.arrow ? ' marker-end="url(#ll-arrow)"' : ""}/>`);
    // groups first so items draw on top
    const order = L.boxes.slice().sort((a, b) => (a.kind === "group" ? -1 : 0) - (b.kind === "group" ? -1 : 0));
    for (const b of order) {
      const cls = b.kind === "item" ? "ll-item" : b.kind === "group" ? "ll-group" : b.kind === "stage" ? "ll-stage" : "ll-box";
      const shape = `<rect class="ll-shape ${cls}${b.attention ? " ll-attn" : ""}" x="${r(b.x)}" y="${r(b.y)}" width="${r(b.w)}" height="${r(b.h)}" rx="6"/>`;
      const cx = r(b.x + b.w / 2);
      const t = [];
      if (b.kind === "item") {
        let yy = b.y + (b.h - (b.titleLines.length * FONT.item.lh + (b.subLines.length ? 2 + b.subLines.length * FONT.sub.lh : 0))) / 2 + FONT.item.size;
        for (const l of b.titleLines) { t.push(`<text class="ll-itemt" x="${cx}" y="${r(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.item.lh; }
        yy += 2;
        for (const l of b.subLines) { t.push(`<text class="ll-sub" x="${cx}" y="${r(yy - 2)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.sub.lh; }
        p.push(`<g class="ll-itemg" data-group="${esc(b.groupId)}">${shape}${t.join("")}</g>`);
        continue;
      }
      const textH = b.titleLines.length * FONT.title.lh + (b.subLines.length ? 3 + b.subLines.length * FONT.sub.lh : 0);
      let yy = b.kind === "group" ? b.y + PAD_Y + FONT.title.size : b.y + (b.h - textH) / 2 + FONT.title.size - 1;
      for (const l of b.titleLines) { t.push(`<text class="ll-title" x="${cx}" y="${r(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.title.lh; }
      yy += 2;
      for (const l of b.subLines) { t.push(`<text class="ll-sub" x="${cx}" y="${r(yy)}" text-anchor="middle">${esc(l)}</text>`); yy += FONT.sub.lh; }
      if (b.noteLines && b.noteLines.length) {
        let ny = b.noteY + FONT.note.size;
        for (const l of b.noteLines) { t.push(`<text class="ll-note" x="${cx}" y="${r(ny)}" text-anchor="middle">${esc(l)}</text>`); ny += FONT.note.lh; }
      }
      const label = [b.node && b.node.title, b.node && b.node.sub].filter(Boolean).join(": ");
      p.push(o.interactive
        ? `<g class="ll-node" data-id="${esc(b.id)}" tabindex="0" role="button" aria-label="${esc(label)}">${shape}${t.join("")}</g>`
        : `<g>${shape}${t.join("")}</g>`);
    }
    p.push("</svg>");
    return p.join("");
  }

  const r = (v) => Math.round(v * 10) / 10;

  LL.layout = { layout, toSvg, wrap, setMeasure, browserMeasure, W, FAMILY, FONT };
})(globalThis.LL = globalThis.LL || {});
