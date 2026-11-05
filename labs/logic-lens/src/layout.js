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
  const LOOP_GUTTER = 24; // room on the right of a loop body for the return arrow
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
      if (LL.flow.LANED[n.kind]) {
        const lanes = n.lanes.map((l) => Math.max(MIN_LANE, minWidth(l.steps, depth + 1, narrow)));
        const need = narrow ? Math.max(...lanes) + 24 : lanes.reduce((a, b) => a + b, 0) + LANE_GAP * (lanes.length - 1);
        w = Math.max(w, need);
      } else if (n.kind === "section") {
        w = Math.max(w, minWidth(n.steps, 1, narrow));
      } else if (n.kind === "loop") {
        w = Math.max(w, minWidth(n.steps, depth + 1, narrow) + LOOP_PAD * 2 + LOOP_GUTTER);
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

    const textBlock = (node, w, maxTitle, maxSub) => {
      const inner = w - PAD_X * 2;
      const titleLines = wrap(node.title || "", FONT.title, inner, maxTitle || 2);
      const subLines = node.sub ? wrap(node.sub, FONT.sub, inner, maxSub || 2) : [];
      const h = PAD_Y * 2 + titleLines.length * FONT.title.lh + (subLines.length ? 3 + subLines.length * FONT.sub.lh : 0);
      return { titleLines, subLines, h: Math.max(h, subLines.length ? 52 : 40), clipped: !!(titleLines.clipped || subLines.clipped) };
    };
    /** The first sentence of why an edited / removed box changed, wrapped for the diagram (none for other boxes). */
    const whyLines = (node, w) => {
      const why = (node.change === "modified" || node.change === "removed") && node.changeNote ? node.changeNote.split(/(?<=[.!?])\s/)[0] : "";
      return why ? wrap(why, FONT.note, w - 28, 2) : [];
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
      let prevRemoved = false; // the box above is a removed one: connectors around it are dashed
      const cx = x + w / 2;

      const connect = (to, removed) => {
        if (!prev) return;
        const dashed = removed || prevRemoved;
        if (merged || prev.length === 1) {
          const p = prev[0];
          if (Math.abs(p.x - to.x) < 0.5) edges.push({ d: `M${p.x} ${p.y}V${to.y}`, arrow: true, removed: dashed });
          else { const midY = to.y - BUS; edges.push({ d: `M${p.x} ${p.y}V${midY}H${to.x}V${to.y}`, arrow: true, removed: dashed }); }
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

        if (LL.flow.LANED[node.kind]) {
          const r = (narrow ? LL.layout._branchNarrow : LL.layout._branchWide)(ctx, node, id, x, w, cursor, depth, isLast, !!prev);
          prev = r.tails.length ? r.tails : null;
          merged = r.merged;
          ended = r.ended;
          prevRemoved = false;
          cursor = r.next;
          return;
        }

        if (node.kind === "section") {
          // an independent entry point: its own header, no arrow from what came before
          if (i > 0) cursor += 34;
          const tb = textBlock(node, w);
          boxes.push({ id, x, y: cursor, w, h: tb.h, kind: "section", attention: node.attention, titleLines: tb.titleLines, subLines: tb.subLines, node, change: node.change, clipped: tb.clipped });
          const hb = cursor + tb.h;
          const r = node.steps.length ? seq(node.steps, x, w, hb + GAP, id + ".", 1, [{ x: cx, y: hb }]) : { bottom: hb };
          prev = null;
          merged = false;
          prevRemoved = false;
          cursor = r.bottom + GAP;
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
              itemBoxes.push({ id: id + ".i" + itemBoxes.length, x: xx, y: yy, w: q.w, h: rh, kind: "item", attention: q.it.attention, titleLines: q.tl, subLines: q.sl, groupId: id, lines: q.it.lines || null, change: q.it.change, full: q.it.title + (q.it.sub ? " — " + q.it.sub : "") });
              xx += q.w + 12;
            }
            yy += rh + 10;
          }
          const noteLines = node.note ? wrap(node.note, FONT.note, inner, 3) : [];
          if (noteLines.length) yy += 2 + noteLines.length * FONT.note.lh;
          const gh = Math.max(yy - gy + (rows.length || noteLines.length ? 6 : 0) + PAD_Y - 4, head.h);
          boxes.push({ id, x: gx, y: gy, w: gw, h: gh, kind: "group", attention: node.attention, titleLines: head.titleLines, subLines: head.subLines, noteLines, node, noteY: yy - noteLines.length * FONT.note.lh, container: true, change: node.change });
          for (const b of itemBoxes) boxes.push(b);
          connect({ x: cx, y: gy }, node.change === "removed");
          prev = [{ x: cx, y: gy + gh }];
          merged = false;
          prevRemoved = node.change === "removed";
          cursor = gy + gh + GAP;
          return;
        }

        if (node.kind === "loop") {
          const fw = depth === 1 && !narrow ? Math.min(w, Math.max(minWidth(node.steps, depth + 1, narrow) + LOOP_PAD * 2 + LOOP_GUTTER, w * 0.72)) : w - 4;
          const fx = x + (w - fw) / 2;
          const head = textBlock({ title: "↻ " + (node.title || ""), sub: node.sub }, fw - 24);
          const fy = cursor;
          connect({ x: cx, y: fy }, node.change === "removed");
          const loopWhy = whyLines(node, fw);
          const textH = PAD_Y + head.titleLines.length * FONT.title.lh + (head.subLines.length ? 3 + head.subLines.length * FONT.sub.lh : 0);
          const headH = textH + 4 + (loopWhy.length ? 4 + loopWhy.length * FONT.note.lh : 0);
          const ix = fx + LOOP_PAD;
          const iw = fw - LOOP_PAD * 2 - LOOP_GUTTER + 8; // leave room for the return arrow on the right
          const icx = ix + iw / 2;
          let bottom = fy + headH;
          if (node.steps.length) {
            const r = seq(node.steps, ix, iw, fy + headH + GAP - 6, id + ".", depth + 1, [{ x: icx, y: fy + headH }]);
            bottom = r.bottom;
            // return arrow: from the end of the body back up to the loop header
            const rx = fx + fw - 13;
            const from = r.tails.length ? r.tails[r.tails.length - 1] : { x: icx, y: bottom };
            const headMid = fy + Math.min(headH / 2 + 2, 22);
            if (!r.ended) edges.push({ d: `M${from.x} ${from.y}V${bottom + 14}H${rx}V${headMid}H${rx - 16}`, arrow: true, loop: true });
          }
          const fh = bottom - fy + (node.steps.length ? 28 : PAD_Y);
          boxes.push({ id, x: fx, y: fy, w: fw, h: fh, kind: "loop", attention: node.attention, titleLines: head.titleLines, subLines: head.subLines, node, container: true, headH, change: node.change, noteLines: loopWhy, noteY: fy + textH + 2, noteKind: loopWhy.length ? node.change : "" });
          prev = [{ x: cx, y: fy + fh }];
          merged = false;
          prevRemoved = node.change === "removed";
          cursor = fy + fh + GAP;
          return;
        }

        // start / step / call / stage / end
        const bw = depth === 1 && !narrow ? Math.min(w, Math.max(TOP_BOX_MIN, w * 0.56)) : Math.max(60, w - 8);
        // room for the effect tag and the change chip so they never cover the title
        const tb = textBlock(node, bw - (node.tag || node.change ? 20 : 0) - (node.kind === "call" ? 12 : 0), 2, depth > 1 ? 3 : 2);
        tb.h += node.tag || node.change ? 8 : 0;
        // an edited or removed box says why, right on the diagram (first sentence of the change note)
        const noteLines = whyLines(node, bw);
        const noteY = cursor + tb.h - PAD_Y + 4;
        if (noteLines.length) tb.h += 6 + noteLines.length * FONT.note.lh;
        const bx = x + (w - bw) / 2;
        const removed = node.change === "removed";
        boxes.push({ id, x: bx, y: cursor, w: bw, h: tb.h, kind: node.kind, attention: node.attention, titleLines: tb.titleLines, subLines: tb.subLines, node, clipped: tb.clipped, change: node.change, noteLines, noteY, noteKind: noteLines.length ? node.change : "" });
        connect({ x: cx, y: cursor }, removed);
        merged = false;
        if (node.kind === "end" && !removed) { prev = null; ended = true; }
        else prev = [{ x: cx, y: cursor + tb.h }];
        prevRemoved = removed;
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

    function laneHead(lane, lid, x, y, w, parallel) {
      const tb = textBlock(lane, w, 2, 3); // lanes are narrow: one more line before cutting the text
      const noteLines = whyLines(lane, w);
      const noteY = y + tb.h - PAD_Y + 4;
      if (noteLines.length) tb.h += 6 + noteLines.length * FONT.note.lh;
      boxes.push({ id: lid, x, y, w, h: tb.h, noteLines, noteY, noteKind: noteLines.length ? lane.change : "", kind: parallel ? "plane" : "lane", attention: lane.attention, titleLines: tb.titleLines, subLines: tb.subLines, lane: true, node: lane, clipped: tb.clipped, change: lane.change });
      return tb.h;
    }

    function questionLabel(text, x, y, anchor, parallel, change) {
      if (!text) return;
      if (change) text = { added: "+ ", modified: "~ ", removed: "− " }[change] + text;
      const f = FONT.label;
      const t = wrap(text, f, 260, 1)[0];
      const tw = measure(t, f) + 14;
      const lx = anchor === "end" ? x - tw : x;
      labels.push({ x: lx, y: y - 9, w: tw, h: 18, text: t, full: text, parallel: !!parallel, change: change || "" });
    }

    // shared with the lane layouts in layout-lanes.js
    const ctx = { boxes, edges, labels, seq, laneHead, questionLabel, textBlock };
    const r = seq(flow.steps, margin, W - margin * 2, 16, "", 1, null);
    let bottom = r.bottom;
    for (const b of boxes) bottom = Math.max(bottom, b.y + b.h);
    return { width: W, height: Math.ceil(bottom + 20), boxes, edges, labels, narrow };
  }

  LL.layout = Object.assign(LL.layout || {}, { layout, wrap, setMeasure, browserMeasure, minWidth, measure, BASE_W, FAMILY, FONT, MIN_LANE, PAD_Y, GAP, BUS, LANE_GAP });
})(globalThis.LL = globalThis.LL || {});
