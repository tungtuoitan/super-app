/* Logic Lens — lay a Flow out top-to-bottom and draw it as SVG.
 * Pure apart from text measurement, which is injected (canvas in the browser, an estimate in Node).
 *
 * Two arrangements for branches:
 *   wide   lanes side by side under a fork bus, rejoining on a merge bus (the reference style)
 *   narrow lanes stacked one under another, hanging off a rail on the left (phones)
 * The drawing widens instead of shrinking boxes when nesting needs more room.
 */
(function (LL) {
  "use strict";

  const BASE_W = 880; // default drawing width in SVG units; the SVG scales to its container
  const FONT = {
    title: { size: 15, weight: 600, lh: 19 },
    sub: { size: 12.5, weight: 400, lh: 16 },
    item: { size: 13, weight: 500, lh: 17 },
    note: { size: 12, weight: 400, lh: 16 },
    label: { size: 11.5, weight: 500, lh: 14 },
  };
  const PAD_X = 14;
  const PAD_Y = 10;
  const GAP = 30; // vertical space between boxes (arrow length)
  const BUS = 18; // fork / merge bus offset
  const LANE_GAP = 16;
  const MIN_LANE = 150; // a lane never gets narrower than this
  const TOP_BOX_MIN = 340;
  const LOOP_PAD = 14;
  const FAMILY = '"Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, sans-serif';

  // ───────────────────────── measurement ─────────────────────────

  let measureFn = null;
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
        if (cache.size > 8000) cache.clear();
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

  /**
   * Greedy word wrap. Over-long words (identifiers) break after . _ / ( - when possible, else mid-word.
   * Returns {lines, clipped}; at most maxLines lines, the last one ellipsized when text was cut.
   */
  function wrap(text, f, maxW, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const out = [];
    let cur = "";
    for (let word of words) {
      while (measure(word, f) > maxW && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut), f) > maxW) cut--;
        // prefer a break right after punctuation inside an identifier
        const soft = Math.max(word.lastIndexOf(".", cut - 1), word.lastIndexOf("_", cut - 1), word.lastIndexOf("/", cut - 1), word.lastIndexOf("(", cut - 1), word.lastIndexOf("-", cut - 1));
        if (soft > cut / 3) cut = soft + 1;
        if (cur) { out.push(cur); cur = ""; }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = cur ? cur + " " + word : word;
      if (measure(next, f) <= maxW) cur = next;
      else { if (cur) out.push(cur); cur = word; }
    }
    if (cur) out.push(cur);
    if (maxLines && out.length > maxLines) {
      const kept = out.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last.length > 1 && measure(last + "…", f) > maxW) last = last.slice(0, -1);
      kept[maxLines - 1] = last.replace(/[\s,.;:]+$/, "") + "…";
      return Object.assign(kept, { clipped: true });
    }
    return out;
  }

  // ───────────────────────── sizing ─────────────────────────

  const ends = (list) => LL.flow.endsPath(list);

  /** Minimum width a sequence needs so no lane drops below MIN_LANE. */
  function minWidth(list, depth, narrow) {
    let w = depth === 1 ? TOP_BOX_MIN : MIN_LANE;
    for (const n of list) {
      if (n.kind === "branch") {
        const lanes = n.lanes.map((l) => Math.max(MIN_LANE, minWidth(l.steps, depth + 1, narrow)));
        const need = narrow ? Math.max(...lanes) + 38 : lanes.reduce((a, b) => a + b, 0) + LANE_GAP * (lanes.length - 1);
        w = Math.max(w, need);
      } else if (n.kind === "loop") {
        w = Math.max(w, minWidth(n.steps, depth + 1, narrow) + LOOP_PAD * 2 + 16);
      } else if (n.kind === "group") {
        w = Math.max(w, depth === 1 ? 360 : MIN_LANE);
      }
    }
    return w;
  }

  // ───────────────────────── layout ─────────────────────────

  /**
   * Lay out a flow. opts: {width (preferred drawing width), narrow (stack lanes vertically)}.
   * Returns {width, height, boxes, edges, labels}.
   */
  function layout(flow, opts) {
    const o = opts || {};
    const narrow = !!o.narrow;
    const margin = narrow ? 10 : 20;
    const W = Math.ceil(Math.max(o.width || BASE_W, minWidth(flow.steps, 1, narrow) + margin * 2));
    const boxes = [];
    const edges = [];
    const labels = [];

    const textBlock = (node, w, maxTitle) => {
      const inner = w - PAD_X * 2;
      const titleLines = wrap(node.title || "", FONT.title, inner, maxTitle || 2);
      const subLines = node.sub ? wrap(node.sub, FONT.sub, inner, 2) : [];
      const h = PAD_Y * 2 + titleLines.length * FONT.title.lh + (subLines.length ? 3 + subLines.length * FONT.sub.lh : 0);
      return { titleLines, subLines, h: Math.max(h, subLines.length ? 52 : 40), clipped: !!(titleLines.clipped || subLines.clipped) };
    };
    const arrowTo = (from, to) => edges.push({ d: `M${from.x} ${from.y}V${to.y}`, arrow: true });

    /**
     * Lay out a sequence in the column [x, x+w] starting at y.
     * from: points the first box connects from. Returns {bottom, tails: points that continue, ended}.
     */
    function seq(list, x, w, y, path, depth, from) {
      let cursor = y;
      let prev = from && from.length ? from : null;
      let merged = false; // prev is a merge-bus point: connect straight down
      let ended = false;
      const cx = x + w / 2;

      const connect = (to) => {
        if (!prev) return;
        if (merged || prev.length === 1) {
          const p = prev[0];
          if (Math.abs(p.x - to.x) < 0.5) arrowTo(p, to);
          else { const midY = to.y - BUS; edges.push({ d: `M${p.x} ${p.y}V${midY}H${to.x}V${to.y}`, arrow: true }); }
        } else {
          const busY = to.y - BUS;
          for (const p of prev) edges.push({ d: `M${p.x} ${p.y}V${busY}`, arrow: false });
          const xs = prev.map((p) => p.x).concat([to.x]);
          edges.push({ d: `M${Math.min(...xs)} ${busY}H${Math.max(...xs)}`, arrow: false });
          edges.push({ d: `M${to.x} ${busY}V${to.y}`, arrow: true });
        }
      };

      list.forEach((node, i) => {
        const id = path + i;
        const isLast = i === list.length - 1;

        if (node.kind === "branch") {
          const r = narrow ? branchNarrow(node, id, x, w, cursor, depth, !!prev) : branchWide(node, id, x, w, cursor, depth, isLast, !!prev);
          prev = r.tails.length ? r.tails : null;
          merged = r.merged;
          ended = r.ended;
          cursor = r.next;
          return;
        }

        if (node.kind === "group") {
          const gw = w;
          const gx = x;
          const head = textBlock(node, gw);
          const inner = gw - PAD_X * 2;
          const items = (node.items || []).map((it) => {
            const tw = Math.max(measure(it.title, FONT.item), it.sub ? measure(it.sub, FONT.sub) : 0);
            const iw = Math.min(inner, Math.max(104, tw + 28));
            const tl = wrap(it.title, FONT.item, iw - 22, 2);
            const sl = it.sub ? wrap(it.sub, FONT.sub, iw - 22, 2) : [];
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
          const gy = cursor;
          let yy = gy + PAD_Y + head.titleLines.length * FONT.title.lh + (head.subLines.length ? 3 + head.subLines.length * FONT.sub.lh : 0) + 12;
          const itemBoxes = [];
          for (const r of rows) {
            const rh = Math.max(...r.map((q) => q.h));
            const total = r.reduce((a, q) => a + q.w, 0) + 12 * (r.length - 1);
            let xx = gx + (gw - total) / 2;
            for (const q of r) {
              itemBoxes.push({ id: id + ".i" + itemBoxes.length, x: xx, y: yy, w: q.w, h: rh, kind: "item", attention: q.it.attention, titleLines: q.tl, subLines: q.sl, groupId: id, full: q.it.title + (q.it.sub ? " — " + q.it.sub : "") });
              xx += q.w + 12;
            }
            yy += rh + 10;
          }
          const noteLines = node.note ? wrap(node.note, FONT.note, inner, 3) : [];
          if (noteLines.length) yy += 2 + noteLines.length * FONT.note.lh;
          const gh = Math.max(yy - gy + (rows.length || noteLines.length ? 6 : 0) + PAD_Y - 4, head.h);
          boxes.push({ id, x: gx, y: gy, w: gw, h: gh, kind: "group", attention: node.attention, titleLines: head.titleLines, subLines: head.subLines, noteLines, node, noteY: yy - noteLines.length * FONT.note.lh, container: true });
          for (const b of itemBoxes) boxes.push(b);
          connect({ x: cx, y: gy });
          prev = [{ x: cx, y: gy + gh }];
          merged = false;
          cursor = gy + gh + GAP;
          return;
        }

        if (node.kind === "loop") {
          const fw = depth === 1 ? Math.min(w, Math.max(minWidth(node.steps, depth + 1, narrow) + LOOP_PAD * 2 + 16, w * 0.72)) : w - 4;
          const fx = x + (w - fw) / 2;
          const head = textBlock({ title: "↻ " + (node.title || ""), sub: node.sub }, fw - 24);
          const fy = cursor;
          connect({ x: cx, y: fy });
          const headH = PAD_Y + head.titleLines.length * FONT.title.lh + (head.subLines.length ? 3 + head.subLines.length * FONT.sub.lh : 0) + 4;
          const ix = fx + LOOP_PAD;
          const iw = fw - LOOP_PAD * 2 - 16; // leave room for the return arrow on the right
          const icx = ix + iw / 2;
          let bottom = fy + headH;
          if (node.steps.length) {
            const r = seq(node.steps, ix, iw, fy + headH + GAP - 6, id + ".", depth + 1, [{ x: icx, y: fy + headH }]);
            bottom = r.bottom;
            // return arrow: from the end of the body back up to the loop header
            const rx = fx + fw - 12;
            if (!r.ended) edges.push({ d: `M${icx} ${bottom}V${bottom + 10}H${rx}V${fy + 16}`, arrow: true, loop: true });
          }
          const fh = bottom - fy + (node.steps.length ? 22 : PAD_Y);
          boxes.push({ id, x: fx, y: fy, w: fw, h: fh, kind: "loop", attention: node.attention, titleLines: head.titleLines, subLines: head.subLines, node, container: true, headH });
          prev = [{ x: cx, y: fy + fh }];
          merged = false;
          cursor = fy + fh + GAP;
          return;
        }

        // step / stage / end
        const bw = depth === 1 ? Math.min(w, Math.max(TOP_BOX_MIN, w * 0.56)) : Math.max(60, w - 8);
        const tb = textBlock(node, bw);
        const bx = x + (w - bw) / 2;
        const isEnd = node.kind === "end";
        boxes.push({ id, x: bx, y: cursor, w: bw, h: tb.h, kind: node.kind, attention: node.attention, titleLines: tb.titleLines, subLines: tb.subLines, node, clipped: tb.clipped });
        connect({ x: cx, y: cursor });
        merged = false;
        if (isEnd) { prev = null; ended = true; }
        else prev = [{ x: cx, y: cursor + tb.h }];
        cursor += tb.h + GAP;
      });

      const tails = ended ? [] : prev || [];
      let bottom = y;
      for (const b of boxes) if (b.id.startsWith(path) && b.id.slice(path.length).split(".").length >= 1 && isInside(b.id, path, list.length)) bottom = Math.max(bottom, b.y + b.h);
      for (const t of tails) bottom = Math.max(bottom, t.y);
      return { bottom, tails, ended: ended && !tails.length };
    }

    // is box id directly or deeply inside one of the first n children of path?
    function isInside(id, path, n) {
      const rest = id.slice(path.length);
      const head = parseInt(rest, 10);
      return Number.isFinite(head) && head < n;
    }

    function laneHead(lane, lid, x, y, w) {
      const tb = textBlock(lane, w);
      boxes.push({ id: lid, x, y, w, h: tb.h, kind: "lane", attention: lane.attention, titleLines: tb.titleLines, subLines: tb.subLines, lane: true, node: lane, clipped: tb.clipped });
      return tb.h;
    }

    function questionLabel(text, x, y, anchor) {
      if (!text) return;
      const f = FONT.label;
      const t = wrap(text, f, 260, 1)[0];
      const tw = measure(t, f) + 14;
      const lx = anchor === "end" ? x - tw : x;
      labels.push({ x: lx, y: y - 9, w: tw, h: 18, text: t, full: text });
    }

    function branchWide(node, id, x, w, top, depth, isLast, hasPrev) {
      const n = node.lanes.length;
      const mins = node.lanes.map((l) => Math.max(MIN_LANE, minWidth(l.steps, depth + 1, false)));
      const sumMin = mins.reduce((a, b) => a + b, 0);
      const spare = Math.max(0, w - sumMin - LANE_GAP * (n - 1));
      const widths = mins.map((m) => m + (spare * m) / sumMin);
      const lefts = [];
      let acc = x;
      for (const lw of widths) { lefts.push(acc); acc += lw + LANE_GAP; }
      const centers = widths.map((lw, j) => lefts[j] + lw / 2);
      const cx = x + w / 2;
      // fork bus sits just above the lanes; the previous box's arrow ends on it
      const busY = top - GAP + BUS;
      const laneTop = busY + 22 + (node.title ? 8 : 0);
      if (hasPrev) {
        edges.push({ d: `M${cx} ${top - GAP}V${busY}`, arrow: false, fork: true });
        const xs = centers.concat([cx]);
        if (n > 1 || Math.abs(centers[0] - cx) > 0.5) edges.push({ d: `M${Math.min(...xs)} ${busY}H${Math.max(...xs)}`, arrow: false });
      }
      if (hasPrev) for (const c of centers) edges.push({ d: `M${c} ${busY}V${laneTop}`, arrow: true });
      if (node.title) questionLabel(node.title, Math.min(...centers) + 8, busY + 13, "start");

      const tails = [];
      let maxBottom = laneTop;
      node.lanes.forEach((lane, j) => {
        const lid = id + ".l" + j;
        const lw = widths[j];
        const hh = laneHead(lane, lid, lefts[j] + 4, laneTop, lw - 8);
        let bottom = laneTop + hh;
        let laneTails = [{ x: centers[j], y: bottom }];
        let laneEnded = false;
        if (lane.steps.length) {
          const r = seq(lane.steps, lefts[j], lw, bottom + GAP, lid + ".", depth + 1, laneTails);
          laneTails = r.tails;
          laneEnded = r.ended;
          bottom = r.bottom;
        }
        maxBottom = Math.max(maxBottom, bottom);
        if (!laneEnded) tails.push(...laneTails);
      });
      if (!tails.length) return { tails: [], merged: false, ended: true, next: maxBottom + GAP };
      if (isLast && depth === 1) return { tails, merged: false, ended: false, next: maxBottom + GAP };
      // merge: drop each continuing lane to a shared bus; the next box hangs off the bus center
      const mergeY = maxBottom + BUS;
      for (const p of tails) edges.push({ d: `M${p.x} ${p.y}V${mergeY}`, arrow: false });
      const xs = tails.map((p) => p.x).concat([cx]);
      if (Math.max(...xs) - Math.min(...xs) > 0.5) edges.push({ d: `M${Math.min(...xs)} ${mergeY}H${Math.max(...xs)}`, arrow: false });
      return { tails: [{ x: cx, y: mergeY }], merged: true, ended: false, next: mergeY + GAP - BUS + 6 };
    }

    function branchNarrow(node, id, x, w, top, depth, hasPrev) {
      const railX = x + 9;
      const lx = x + 24;
      const lw = w - 24 - 16;
      const rightX = x + w - 7;
      const cx = x + w / 2;
      const forkY = top - GAP + BUS;
      if (hasPrev) edges.push({ d: `M${cx} ${top - GAP}V${forkY}H${railX}`, arrow: false });
      if (node.title) questionLabel(node.title, railX + 8, forkY - 12, "start");
      let y = forkY + 14 + (node.title ? 10 : 0);
      const continuing = [];
      let lastHeadMid = forkY;
      node.lanes.forEach((lane, j) => {
        const lid = id + ".l" + j;
        const hh = laneHead(lane, lid, lx, y, lw);
        const mid = y + hh / 2;
        edges.push({ d: `M${railX} ${mid}H${lx}`, arrow: true });
        lastHeadMid = mid;
        let bottom = y + hh;
        let tails = [{ x: lx + lw / 2, y: bottom }];
        let laneEnded = false;
        if (lane.steps.length) {
          const r = seq(lane.steps, lx, lw, bottom + GAP, lid + ".", depth + 1, tails);
          tails = r.tails;
          laneEnded = r.ended;
          bottom = r.bottom;
        }
        if (!laneEnded) {
          // each continuing lane drops a short line and runs right to the merge rail
          const jy = bottom + 10;
          for (const p of tails) edges.push({ d: `M${p.x} ${p.y}V${jy}H${rightX}`, arrow: false });
          continuing.push(jy);
        }
        y = bottom + 26;
      });
      edges.push({ d: `M${railX} ${hasPrev ? forkY : forkY + 14}V${lastHeadMid}`, arrow: false });
      if (!continuing.length) return { tails: [], merged: false, ended: true, next: y - 26 + GAP };
      const mergeY = y - 6;
      edges.push({ d: `M${rightX} ${Math.min(...continuing)}V${mergeY}H${cx}`, arrow: false });
      return { tails: [{ x: cx, y: mergeY }], merged: true, ended: false, next: mergeY + GAP - BUS + 6 };
    }

    const r = seq(flow.steps, margin, W - margin * 2, 16, "", 1, null);
    let bottom = r.bottom;
    for (const b of boxes) bottom = Math.max(bottom, b.y + b.h);
    return { width: W, height: Math.ceil(bottom + 20), boxes, edges, labels, narrow };
  }

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
      if (b.kind === "item") return `<g class="ll-itemg" data-group="${esc(b.groupId)}">${body}</g>`;
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

  LL.layout = { layout, toSvg, wrap, setMeasure, browserMeasure, minWidth, BASE_W, FAMILY, FONT, MIN_LANE };
})(globalThis.LL = globalThis.LL || {});
