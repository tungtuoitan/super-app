/* Logic Lens — "Chạy thử": follow the path the code really takes, box by box. The current box glows, boxes already
 * passed keep a trail, the rest fade. At a branch the card asks which way to go (or a scenario answers); "Tự chạy"
 * steps on its own and pauses at questions it cannot answer.
 */
(function (LL) {
  "use strict";

  const { S, $, hooks } = LL.app;
  const STEP_MS = 1100;
  const EXIT_WORD = { return: "trả về", throw: "ném lỗi", respond: "trả phản hồi", navigate: "chuyển trang", back: "về màn hình", exit: "thoát chương trình", break: "thoát vòng lặp", continue: "sang lượt kế" };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const idOf = (node) => { for (const e of S.nodes) if (e.node === node) return e.id; return null; };

  function scenarios() {
    return (S.flow && S.flow.scenarios) || [];
  }

  function fillScenarios() {
    const sel = $("run-scn");
    sel.textContent = "";
    sel.appendChild(new Option("Tự chọn nhánh", ""));
    scenarios().forEach((x, i) => sel.appendChild(new Option("Kịch bản: " + x.title, String(i))));
    sel.hidden = !scenarios().length;
  }

  /** Start (or restart) a run; `scn` is a scenario index or "" for choosing by hand. */
  function start(scn) {
    if (!S.flow || !S.nodes.length) return;
    stopTimer();
    const pick = scn !== "" && scn != null ? scenarios()[+scn] : null;
    S.tour = false;
    S.run = { runner: LL.flowRun.create(S.flow, pick ? { picks: pick.picks } : null), trail: [], current: null, steps: 0, timer: 0, ended: null, scenario: pick };
    $("tour-bar").hidden = true;
    $("run-bar").hidden = false;
    $("run-scn").value = pick ? String(scn) : "";
    advance();
    if (pick) play(true);
  }

  function stop() {
    stopTimer();
    S.run = null;
    $("run-bar").hidden = true;
    $("tour-bar").hidden = false;
    $("run-box").hidden = true;
    LL.app.select(null);
  }

  /** Move to the next box (or show the question / the end). */
  function advance() {
    const run = S.run;
    if (!run) return;
    const r = run.runner.next();
    if (r.node) {
      const id = idOf(r.node);
      run.steps++;
      if (id) { run.current = id; if (!run.trail.includes(id)) run.trail.push(id); }
      LL.app.select(id);
    } else if (r.done) {
      run.ended = r;
      stopTimer();
    } else if (r.choice) {
      if (!run.scenario) stopTimer(); // a question pauses "Tự chạy" until it is answered
    }
    showBox(r);
    paint();
  }

  function choose(i) {
    if (!S.run) return;
    S.run.runner.choose(i);
    advance();
    if (S.run && S.run.playing) schedule();
  }

  /** The run's part of the card: a question with one button per answer, or how the run ended. */
  function showBox(r) {
    const box = $("run-box");
    box.textContent = "";
    box.hidden = false;
    $("explain-card").hidden = false;
    $("pane-canvas").classList.add("card-on");
    $("run-count").textContent = S.run.steps + " bước";
    if (r.choice) {
      box.appendChild(el("div", "run-q", r.choice.question));
      const opts = el("div", "run-opts");
      r.choice.options.forEach((t, i) => {
        const b = el("button", "btn sm", (i < 9 ? i + 1 + ". " : "") + t);
        b.type = "button";
        b.addEventListener("click", () => choose(i));
        opts.appendChild(b);
      });
      box.appendChild(opts);
      $("run-step").disabled = true;
      return;
    }
    $("run-step").disabled = !!r.done;
    if (r.done) {
      const end = r.end;
      box.appendChild(el("div", "run-q", end ? `Kết thúc: ${EXIT_WORD[end.exit] || "trả về"} tại “${end.title}”.` : "Đã chạy hết luồng."));
      const again = el("button", "btn sm primary", "↺ Chạy lại");
      again.type = "button";
      again.addEventListener("click", () => start($("run-scn").value));
      const opts = el("div", "run-opts");
      opts.appendChild(again);
      box.appendChild(opts);
      return;
    }
    box.hidden = true;
  }

  function schedule() {
    clearTimeout(S.run.timer);
    S.run.timer = setTimeout(() => {
      if (!S.run || !S.run.playing) return;
      if (S.run.runner.waiting || S.run.ended) { setPlaying(false); return; }
      advance();
      if (S.run && S.run.playing && !S.run.ended && !S.run.runner.waiting) schedule();
      else if (S.run && (S.run.ended || S.run.runner.waiting)) setPlaying(S.run.runner.waiting && !S.run.ended);
    }, STEP_MS);
  }
  function setPlaying(on) {
    if (!S.run) return;
    S.run.playing = on;
    const b = $("run-play");
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "⏸ Dừng lại" : "▶ Tự chạy";
  }
  function play(on) {
    if (!S.run) return;
    if (S.run.ended) start($("run-scn").value);
    setPlaying(on);
    if (on) schedule();
    else clearTimeout(S.run.timer);
  }
  function stopTimer() {
    if (S.run) { clearTimeout(S.run.timer); setPlaying(false); }
  }

  /** The current box glows, the trail stays, everything else fades. */
  function paint() {
    const svg = $("canvas").querySelector("svg");
    if (!svg) return;
    const run = S.run;
    svg.querySelectorAll(".ll-node").forEach((g) => {
      const id = g.getAttribute("data-id");
      g.classList.toggle("run-now", !!run && id === run.current);
      g.classList.toggle("run-trail", !!run && id !== run.current && run.trail.includes(id));
      g.classList.toggle("run-dim", !!run && !run.trail.includes(id));
    });
  }

  function boot() {
    $("run").addEventListener("click", () => start(""));
    $("run-stop").addEventListener("click", stop);
    $("run-restart").addEventListener("click", () => start($("run-scn").value));
    $("run-step").addEventListener("click", () => { stopTimer(); advance(); });
    $("run-play").addEventListener("click", () => play(!(S.run && S.run.playing)));
    $("run-scn").addEventListener("change", () => start($("run-scn").value));
    document.addEventListener("keydown", (e) => {
      if (!S.run || e.target.closest("textarea, input, select")) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); stop(); }
      else if ((e.key === " " || e.key === "ArrowRight") && !S.run.runner.waiting && !S.run.ended) { e.preventDefault(); e.stopImmediatePropagation(); stopTimer(); advance(); }
      else if (/^[1-9]$/.test(e.key) && S.run.runner.waiting) choose(+e.key - 1);
    }, true);
  }

  hooks.flow.push(() => { if (S.run) stop(); fillScenarios(); $("run").hidden = !S.nodes.length; });
  hooks.render.push(paint);
  hooks.paint.push(paint);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  Object.assign(LL.app, { runStart: start, runStop: stop, runChoose: choose });
})(globalThis.LL = globalThis.LL || {});
