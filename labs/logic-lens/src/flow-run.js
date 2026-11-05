/* Logic Lens — "run" a flow: walk the path the code actually takes, one box at a time.
 * Pure (no DOM). At a branch the run stops and asks which lane to take (or follows a scenario's picks);
 * at the end of a loop body it asks whether to go round again. Parallel lanes are walked one after another.
 *
 *   const run = LL.flowRun.create(flow, {picks: ["ok", "paid"]});
 * An end with exit "back" (the user is back on the same screen) returns to the "what does the user do?" branch.
 *
 *   run.next()  -> {node}                      a box to show (node is a flow node or lane)
 *               -> {choice: {kind, node, question, options: [title]}}   waiting for run.choose(i)
 *               -> {done: true, end: node|null} the path stopped (an end box, or the flow ran out)
 *   run.choose(i)
 */
(function (LL) {
  "use strict";

  const { LANED } = LL.flow;
  const live = (list) => (list || []).filter((n) => n.change !== "removed");
  const norm = (s) => String(s || "").toLowerCase().replace(/[“”"'`]/g, "").replace(/\s+/g, " ").trim();
  const LOOP_OPTIONS = ["Lặp lại lần nữa", "Thoát vòng lặp"];

  function create(flow, opts) {
    const o = opts || {};
    const picks = o.picks ? o.picks.slice() : null;
    const top = live(flow.steps);
    const sections = top.filter((n) => n.kind === "section");
    let frames = [];
    let pending = null; // {choice, resolve(i)}
    let afterEnd = null; // the end box just shown: what happens next depends on its exit
    let done = null;
    const asked = []; // branches answered so far: {node, frame, at} (where to come back to)

    /** Take the scenario's next pick if it names one of the options. */
    function autoPick(options) {
      if (!picks || !picks.length) return -1;
      const want = norm(picks[0]);
      let i = options.findIndex((t) => norm(t) === want);
      if (i < 0) i = options.findIndex((t) => norm(t).includes(want) || want.includes(norm(t)));
      if (i >= 0) picks.shift();
      return i;
    }
    function ask(choice, resolve) {
      // scenarios run loops once and follow their picks at branches
      if (picks && choice.kind === "loop") { resolve(1); return null; }
      const auto = choice.kind === "branch" || choice.kind === "section" ? autoPick(choice.options) : -1;
      if (auto >= 0) { resolve(auto); return null; }
      pending = { choice, resolve };
      return { choice };
    }
    const laneFrame = (lane) => ({ list: [{ laneBox: lane }].concat(live(lane.steps)), i: 0 });

    function start() {
      frames = [];
      if (sections.length > 1 || (sections.length === 1 && top.length > 1)) {
        // several entry points: the user picks where to start
        return ask({ kind: "section", node: null, question: "Bắt đầu từ đâu?", options: top.map((n) => n.title || "…") }, (i) => {
          const n = top[i];
          frames = [n.kind === "section" ? { list: [{ laneBox: n }].concat(live(n.steps)), i: 0 } : { list: top.slice(i), i: 0 }];
        });
      }
      frames = [{ list: sections.length === 1 ? [{ laneBox: sections[0] }].concat(live(sections[0].steps)) : top, i: 0 }];
      return null;
    }

    function finishEnd() {
      const end = afterEnd;
      afterEnd = null;
      const exit = end.exit || "return";
      const loopAt = frames.map((f) => !!f.loop).lastIndexOf(true);
      if ((exit === "continue" || exit === "break") && loopAt >= 0) {
        frames = frames.slice(0, loopAt + 1);
        const f = frames[loopAt];
        if (exit === "continue") f.i = f.list.length; // straight to "go round again?"
        else { frames.pop(); }
        return true;
      }
      if (exit === "back") {
        // back on the same screen: ask "what does the user do?" again (the outermost such branch, else the outermost branch)
        const home = asked.find((a) => /làm gì|does what|what next|chọn gì/i.test(a.node.title || "")) || asked[0];
        if (home) {
          frames = frames.slice(0, home.frame + 1);
          frames[home.frame].i = home.at;
          asked.length = asked.indexOf(home);
          return true;
        }
      }
      done = { done: true, end };
      return false;
    }

    function next() {
      if (done) return done;
      if (pending) return { choice: pending.choice };
      if (afterEnd && !finishEnd()) return done;
      while (frames.length) {
        const f = frames[frames.length - 1];
        if (f.i >= f.list.length) {
          frames.pop();
          if (f.loop) {
            const asked = ask({ kind: "loop", node: f.loop, question: "Hết một vòng: lặp tiếp?", options: LOOP_OPTIONS }, (i) => {
              if (i === 0) frames.push({ list: live(f.loop.steps), i: 0, loop: f.loop });
            });
            if (asked) return asked;
          }
          continue;
        }
        const n = f.list[f.i++];
        if (n.laneBox) return { node: n.laneBox };
        if (LANED[n.kind]) {
          const lanes = n.lanes.filter((l) => l.change !== "removed");
          if (!lanes.length) continue;
          if (n.kind === "parallel") {
            frames.push({ list: lanes.flatMap((l) => [{ laneBox: l }].concat(live(l.steps))), i: 0 });
            continue;
          }
          const where = { node: n, frame: frames.length - 1, at: f.i - 1 };
          const q = ask({ kind: "branch", node: n, question: n.title || "Đi nhánh nào?", options: lanes.map((l) => l.title || "…") }, (i) => { asked.push(where); frames.push(laneFrame(lanes[i])); });
          if (q) return q;
          continue;
        }
        if (n.kind === "loop") { frames.push({ list: live(n.steps), i: 0, loop: n }); return { node: n }; }
        if (n.kind === "section") { frames.push({ list: live(n.steps), i: 0 }); return { node: n }; }
        if (n.kind === "end") { afterEnd = n; return { node: n, end: true }; }
        return { node: n };
      }
      done = { done: true, end: null };
      return done;
    }

    function choose(i) {
      if (!pending) return;
      const p = pending;
      pending = null;
      p.resolve(Math.max(0, Math.min(p.choice.options.length - 1, i)));
    }

    start();
    return {
      next,
      choose,
      get waiting() { return !!pending; },
      get finished() { return !!done; },
    };
  }

  LL.flowRun = { create };
})(globalThis.LL = globalThis.LL || {});
