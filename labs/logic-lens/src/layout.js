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
        const need = narrow ? Math.max(...lanes) + 24 : lanes.reduce((a, b) => a + b, 0) + LANE_GAP * (lanes.length - 1);
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
              itemBoxes.push({ id: id + ".i" + itemBoxes.length, x: xx, y: yy, w: q.w, h: rh, kind: "item", attention: q.it.attention, titleLines: q.tl, subLines: q.sl, groupId: id, lines: q.it.lines || null, full: q.it.title + (q.it.sub ? " — " + q.it.sub : "") });
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
            const rx = fx + fw - 10;
            const from = r.tails.length ? r.tails[r.tails.length - 1] : { x: icx, y: bottom };
            const headMid = fy + Math.min(headH / 2 + 2, 22);
            if (!r.ended) edges.push({ d: `M${from.x} ${from.y}V${bottom + 10}H${rx}V${headMid}H${rx - 12}`, arrow: true, loop: true });
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

    /**
     * Phones: lanes stacked under one another, hanging off a rail on the left. The rail starts at the fork and
     * continues past the last lane to where the paths join again; lanes that end early stop at their end box.
     */
    function branchNarrow(node, id, x, w, top, depth, hasPrev) {
      const railX = x + 9;
      const lx = x + 24;
      const lw = w - 24;
      const cx = x + w / 2;
      const forkY = top - GAP + BUS;
      if (hasPrev) edges.push({ d: `M${cx} ${top - GAP}V${forkY}H${railX}`, arrow: false });
      let y = forkY + 14;
      if (node.title) { questionLabel(node.title, railX + 10, y + 4, "start"); y += 24; }
      const n = node.lanes.length;
      let anyContinues = false;
      let lastHeadMid = forkY;
      node.lanes.forEach((lane, j) => {
        const lid = id + ".l" + j;
        // the lane number makes it clear these are alternatives, not a sequence
        const head = Object.assign({}, lane, { sub: `nhánh ${j + 1}/${n}` + (lane.sub ? " · " + lane.sub : "") });
        const hh = laneHead(head, lid, lx, y, lw);
        const mid = y + hh / 2;
        edges.push({ d: `M${railX} ${mid}H${lx}`, arrow: true });
        lastHeadMid = mid;
        let bottom = y + hh;
        if (lane.steps.length) {
          const r = seq(lane.steps, lx, lw, bottom + GAP, lid + ".", depth + 1, [{ x: lx + lw / 2, y: bottom }]);
          if (!r.ended) anyContinues = true;
          bottom = r.bottom;
        } else anyContinues = true;
        y = bottom + 22;
      });
      if (!anyContinues) {
        edges.push({ d: `M${railX} ${forkY}V${lastHeadMid}`, arrow: false });
        return { tails: [], merged: false, ended: true, next: y - 22 + GAP };
      }
      // the rail runs on to the join point, then back to the middle where the main path continues
      const joinY = y - 4;
      edges.push({ d: `M${railX} ${forkY}V${joinY}H${cx}`, arrow: false });
      return { tails: [{ x: cx, y: joinY }], merged: true, ended: false, next: joinY + GAP - BUS + 6 };
    }

    const r = seq(flow.steps, margin, W - margin * 2, 16, "", 1, null);
    let bottom = r.bottom;
    for (const b of boxes) bottom = Math.max(bottom, b.y + b.h);
    return { width: W, height: Math.ceil(bottom + 20), boxes, edges, labels, narrow };
  }

  LL.layout = Object.assign(LL.layout || {}, { layout, wrap, setMeasure, browserMeasure, minWidth, BASE_W, FAMILY, FONT, MIN_LANE, PAD_Y });
})(globalThis.LL = globalThis.LL || {});
