/* Logic Lens — laying out branch and parallel lanes, called from layout.js through a shared ctx.
 *   wide   lanes side by side under a fork bus (thick bar for parallel), rejoining on a merge bus / join bar
 *   narrow lanes stacked one under another off a rail on the left (phones)
 */
(function (LL) {
  "use strict";

  const { GAP, BUS, LANE_GAP, MIN_LANE } = LL.layout;

  function branchWide(ctx, node, id, x, w, top, depth, isLast, hasPrev) {
    const { edges, seq, laneHead, questionLabel } = ctx;
    const parallel = node.kind === "parallel";
    const n = node.lanes.length;
    const mins = node.lanes.map((l) => Math.max(MIN_LANE, LL.layout.minWidth(l.steps, depth + 1, false)));
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
    const laneTop = busY + 22 + (node.title || parallel ? 8 : 0);
    if (hasPrev) {
      edges.push({ d: `M${cx} ${top - GAP}V${busY}`, arrow: false, fork: true });
      const xs = centers.concat([cx]);
      // parallel paths start together at a thick bar (UML fork); exclusive ones split at a thin bus
      const pad = parallel ? 12 : 0;
      if (n > 1 || Math.abs(centers[0] - cx) > 0.5) edges.push({ d: `M${Math.min(...xs) - pad} ${busY}H${Math.max(...xs) + pad}`, arrow: false, bar: parallel });
    }
    if (hasPrev) for (const c of centers) edges.push({ d: `M${c} ${busY}V${laneTop}`, arrow: true });
    const label = parallel ? "song song" + (node.title ? ": " + node.title : "") : node.title;
    if (label) questionLabel(label, Math.min(...centers) + 8, busY + 13, "start", parallel, node.change);

    const tails = [];
    let maxBottom = laneTop;
    node.lanes.forEach((lane, j) => {
      const lid = id + ".l" + j;
      const lw = widths[j];
      const hh = laneHead(lane, lid, lefts[j] + 4, laneTop, lw - 8, parallel);
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
    // parallel paths are awaited together at a thick join bar
    const jpad = parallel ? 12 : 0;
    if (Math.max(...xs) - Math.min(...xs) > 0.5 || parallel) edges.push({ d: `M${Math.min(...xs) - jpad} ${mergeY}H${Math.max(...xs) + jpad}`, arrow: false, bar: parallel });
    return { tails: [{ x: cx, y: mergeY }], merged: true, ended: false, next: mergeY + GAP - BUS + 6 };
  }

  /**
   * A guard clause (if bad: stop) as a side exit: the normal path goes straight down; the failing case leaves to the
   * right, to its end box. Only for a branch of two lanes where one lane is a single end box and the other is empty.
   * Returns null when the branch is not a guard or the column is too narrow for a side exit.
   */
  function guardSide(ctx, node, id, x, w, top, depth, hasPrev) {
    if (node.kind !== "branch" || node.lanes.length !== 2 || w < 440) return null;
    const stopAt = node.lanes.findIndex((l) => l.steps.length === 1 && l.steps[0].kind === "end" && l.steps[0].change !== "removed");
    const goAt = 1 - stopAt;
    if (stopAt < 0 || node.lanes[goAt].steps.length || node.lanes[goAt].change || node.lanes[stopAt].change === "removed") return null;
    const { edges, seq, laneHead, questionLabel } = ctx;
    const stop = node.lanes[stopAt];
    const go = node.lanes[goAt];
    const cx = x + w / 2;
    const sideW = Math.min(250, w / 2 - 40);
    const sideX = x + w - sideW;
    const laneTop = top - 6;
    const hh = laneHead(stop, id + ".l" + stopAt, sideX, laneTop, sideW, false);
    const rowY = laneTop + hh / 2;
    if (hasPrev) edges.push({ d: `M${cx} ${top - GAP}V${rowY}`, arrow: false });
    edges.push({ d: `M${cx} ${rowY}H${sideX}`, arrow: true });
    // the question and the normal answer sit on the left of the main line
    const real = (t) => t && t !== "…";
    if (real(node.title)) questionLabel(node.title, cx - 10, rowY - 12, "end", false, node.change);
    if (real(go.title)) questionLabel(go.title + " ↓", cx - 10, rowY + 12, "end", false, "", id + ".l" + goAt);
    ctx.hidden.push(id + ".l" + goAt);
    const r = seq(stop.steps, sideX, sideW, laneTop + hh + GAP, id + ".l" + stopAt + ".", depth + 1, [{ x: sideX + sideW / 2, y: laneTop + hh }]);
    const bottom = Math.max(r.bottom, rowY + 34);
    // the main line runs on past the side exit, so whatever comes next (a fork, another guard) hangs off it
    edges.push({ d: `M${cx} ${rowY}V${bottom}`, arrow: false });
    return { tails: [{ x: cx, y: bottom }], merged: true, ended: false, next: bottom + GAP };
  }

  /**
   * Phones: lanes stacked under one another, hanging off a rail on the left. The rail starts at the fork and
   * continues past the last lane to where the paths join again; lanes that end early stop at their end box.
   */
  function branchNarrow(ctx, node, id, x, w, top, depth, isLast, hasPrev) {
    const { edges, seq, laneHead, questionLabel } = ctx;
    const parallel = node.kind === "parallel";
    const railX = x + 9;
    const lx = x + 24;
    const lw = w - 24;
    const cx = x + w / 2;
    const forkY = top - GAP + BUS;
    if (hasPrev) edges.push({ d: `M${cx} ${top - GAP}V${forkY}H${railX}`, arrow: false });
    let y = forkY + 14;
    const label = parallel ? "song song" + (node.title ? ": " + node.title : "") : node.title;
    if (label) { questionLabel(label, railX + 10, y + 4, "start", parallel, node.change); y += 24; }
    const n = node.lanes.length;
    let anyContinues = false;
    let lastHeadMid = forkY;
    let lastTails = [];
    node.lanes.forEach((lane, j) => {
      const lid = id + ".l" + j;
      // the lane number makes it clear these are alternatives, not a sequence
      const head = Object.assign({}, lane, { sub: `${parallel ? "song song" : "nhánh"} ${j + 1}/${n}` + (lane.sub ? " · " + lane.sub : "") });
      const hh = laneHead(head, lid, lx, y, lw, parallel);
      const mid = y + hh / 2;
      edges.push({ d: `M${railX} ${mid}H${lx}`, arrow: true });
      lastHeadMid = mid;
      let bottom = y + hh;
      let tails = [{ x: lx + lw / 2, y: bottom }];
      if (lane.steps.length) {
        const r = seq(lane.steps, lx, lw, bottom + GAP, lid + ".", depth + 1, tails);
        tails = r.ended ? [] : r.tails;
        bottom = r.bottom;
      }
      // a path that carries on drops back to the rail, which leads to the join (the last one drops straight into it)
      if (tails.length) anyContinues = true;
      if (j === n - 1) lastTails = tails;
      else for (const t of tails) edges.push({ d: `M${t.x} ${t.y}V${bottom + 11}H${railX}`, arrow: false });
      y = bottom + 22;
    });
    if (!anyContinues) {
      edges.push({ d: `M${railX} ${forkY}V${lastHeadMid}`, arrow: false, bar: parallel });
      return { tails: [], merged: false, ended: true, next: y - 22 + GAP };
    }
    // the rail runs on to the join point, then back to the middle where the main path continues
    const joinY = y - 4;
    edges.push({ d: `M${railX} ${forkY}V${joinY}`, arrow: false, bar: parallel });
    const joinEnd = Math.max(cx, ...lastTails.map((t) => t.x));
    edges.push({ d: `M${railX} ${joinY}H${joinEnd}`, arrow: false });
    for (const t of lastTails) edges.push({ d: `M${t.x} ${t.y}V${joinY}`, arrow: false });
    return { tails: [{ x: cx, y: joinY }], merged: true, ended: false, next: joinY + GAP - BUS + 6 };
  }

  Object.assign(LL.layout, { _branchWide: branchWide, _branchNarrow: branchNarrow, _guardSide: guardSide });
})(globalThis.LL = globalThis.LL || {});
