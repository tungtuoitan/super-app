/* Logic Lens — "run" a flow: walk the path the code actually takes, one box at a time.
 * Pure (no DOM). At a branch the run stops and asks which lane to take (or follows a scenario's picks);
 * at the end of a loop body it asks whether to go round again. Parallel lanes are walked one after another.
 *
 * Screens: an end with exit "back" (the dialog closes, the user is back on the page) returns to the page's
 * "what does the user do?" branch; "stay" (still in the same dialog or form) returns to the innermost user
 * choice. A lane of a user-choice branch that simply runs out counts as "back".
 *
 *   const run = LL.flowRun.create(flow, {picks: ["ok", "paid"]});
 *   run.next()  -> {node, together}             a box to show (node is a flow node or lane); at a parallel,
 *                                               `together` lists every lane that starts at the same time
 *               -> {choice: {kind, node, question, options: [title], lanes}, back}   waiting for run.choose(i)
 *               -> {done: true, end: node|null, scenarioDone}   the path stopped
 *   run.choose(i)
 */
(function (LL) {
  "use strict";

  const { LANED } = LL.flow;
  const live = (list) => (list || []).filter((n) => n.change !== "removed");
  const norm = (s) => String(s || "").toLowerCase().replace(/[“”"'`]/g, "").replace(/\s+/g, " ").trim();
  const LOOP_OPTIONS = ["Lặp lại lần nữa", "Thoát vòng lặp"];
  const HOME = /làm gì|does what|what next|chọn gì|user (does|picks|chooses)/i;

  /** A branch whose lanes are things the user does (tagged USER, or titled like "User does what?"). */
  const userChoice = (n) => HOME.test(n.title || "") || n.tag === "USER" || (n.lanes || []).some((l) => l.tag === "USER");

  function create(flow, opts) {
    const o = opts || {};
    const picks = o.picks ? o.picks.slice() : null;
    const top = live(flow.steps);
    const sections = top.filter((n) => n.kind === "section");
    let frames = [];
    let pending = null; // {choice, resolve(i)}
    let afterEnd = null; // the end box just shown: what happens next depends on its exit
    let done = null;
    let lastShown = null; // the box shown last: names the question of an untitled branch
    let cameBack = false;
    const asked = []; // branches answered so far: {node, frame, at} (where to come back to)

    /** Take the scenario's next pick if it names one of the options: exactly, or as part of just one. */
    function autoPick(options) {
      if (!picks || !picks.length) return -1;
      const want = norm(picks[0]);
      let i = options.findIndex((t) => norm(t) === want);
      if (i < 0) {
        const hits = options.map((t, j) => (norm(t).includes(want) ? j : -1)).filter((j) => j >= 0);
        if (hits.length === 1) i = hits[0];
      }
      if (i >= 0) picks.shift();
      return i;
    }
    function ask(choice, resolve) {
      // scenarios run loops once and follow their picks at branches
      if (picks && choice.kind === "loop") { resolve(1); return null; }
      const auto = choice.kind === "branch" || choice.kind === "section" ? autoPick(choice.options) : -1;
      if (auto >= 0) { resolve(auto); return null; }
      pending = { choice, resolve };
      const back = cameBack;
      cameBack = false;
      return { choice, back };
    }
    const laneFrame = (lane, home) => ({ list: [{ laneBox: lane }].concat(live(lane.steps)), i: 0, home });

    function start() {
      frames = [];
      if (sections.length > 1 || (sections.length === 1 && top.length > 1)) {
        // several entry points: the user picks where to start (a section header is not a step of the run)
        return ask({ kind: "section", node: null, question: "Bắt đầu từ đâu?", options: top.map((n) => n.title || "…") }, (i) => {
          const n = top[i];
          frames = [n.kind === "section" ? { list: live(n.steps), i: 0 } : { list: top.slice(i), i: 0 }];
        });
      }
      frames = [{ list: sections.length === 1 ? live(sections[0].steps) : top, i: 0 }];
      return null;
    }

    /** Go back to an answered branch and ask it again. */
    function returnTo(where) {
      frames = frames.slice(0, where.frame + 1);
      frames[where.frame].i = where.at;
      asked.length = asked.indexOf(where);
      cameBack = true;
    }
    /** A scenario has nothing left to pick: it is over once the user is back on a screen. */
    const scenarioOver = () => !!picks && !picks.length;

    function finishEnd() {
      const end = afterEnd;
      afterEnd = null;
      const exit = end.exit || "return";
      const loopAt = frames.map((f) => !!f.loop).lastIndexOf(true);
      if ((exit === "continue" || exit === "break") && loopAt >= 0) {
        frames = frames.slice(0, loopAt + 1);
        const f = frames[loopAt];
        if (exit === "continue") f.i = f.list.length; // straight to "go round again?"
        else frames.pop();
        return true;
      }
      if ((exit === "back" || exit === "stay") && !scenarioOver()) {
        const users = asked.filter((a) => userChoice(a.node));
        // back: the page's choice (outermost); stay: the choice the user is still in (innermost)
        const where = exit === "back"
          ? users[0] || asked[0]
          : users[users.length - 1] || asked[asked.length - 2] || asked[0];
        if (where) { returnTo(where); return true; }
      }
      done = { done: true, end, scenarioDone: !!picks && (exit === "back" || exit === "stay") };
      return false;
    }

    /** The question of a branch: its title, else the check named by the box before it. */
    function questionOf(n) {
      if (n.title) return n.title;
      const prev = lastShown;
      if (prev && prev.sub && /\?\s*$/.test(prev.sub)) return prev.sub;
      if (prev && prev.title && prev.kind) return "Kết quả của " + prev.title.replace(/[?.:]+$/, "") + "?";
      return "Đi nhánh nào?";
    }

    function show(node, extra) {
      lastShown = node;
      return Object.assign({ node }, extra);
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
            const q = ask({ kind: "loop", node: f.loop, question: "Hết một vòng: lặp tiếp?", options: LOOP_OPTIONS }, (i) => {
              if (i === 0) frames.push({ list: live(f.loop.steps), i: 0, loop: f.loop });
            });
            if (q) return q;
          }
          // a user's action that just runs out: they are back on the screen
          if (f.home) {
            if (scenarioOver()) { done = { done: true, end: null, scenarioDone: true }; return done; }
            returnTo(f.home);
          }
          continue;
        }
        const n = f.list[f.i++];
        if (n.laneBox) return show(n.laneBox);
        if (LANED[n.kind]) {
          const lanes = n.lanes.filter((l) => l.change !== "removed");
          if (!lanes.length) continue;
          if (n.kind === "parallel") {
            // all lanes start together (shown at once), then each lane's steps are walked in turn
            frames.push({ list: lanes.flatMap((l, j) => (j ? [{ laneBox: l }] : []).concat(live(l.steps))), i: 0 });
            return show(lanes[0], { together: lanes });
          }
          const where = { node: n, frame: frames.length - 1, at: f.i - 1 };
          const choice = { kind: "branch", node: n, question: questionOf(n), options: lanes.map((l) => l.title || "…"), lanes };
          const q = ask(choice, (i) => { asked.push(where); frames.push(laneFrame(lanes[i], userChoice(n) ? where : null)); });
          if (q) return q;
          continue;
        }
        if (n.kind === "loop") { frames.push({ list: live(n.steps), i: 0, loop: n }); return show(n); }
        if (n.kind === "section") { frames.push({ list: live(n.steps), i: 0 }); continue; }
        if (n.kind === "end") { afterEnd = n; return show(n, { end: true }); }
        return show(n);
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

  LL.flowRun = { create, userChoice };
})(globalThis.LL = globalThis.LL || {});
