/**
 * Content script — the bot on every page (TungRoot #1485). TEMPORARY look; the final design comes
 * from Claude Design (see TungRoot document/tasks/1481-homepage-tien-bo/ui-prompt.md, phần Bot).
 *
 * Privacy: never reads the page. Only listens for keydown (to stay away while the user types).
 * The question is hidden behind a neutral bubble until clicked. Rendered in a closed shadow root
 * so the page cannot read or restyle it.
 */
(() => {
    if (window.top !== window || window.__superappCompanion) return;
    window.__superappCompanion = true;

    const TYPING_QUIET_MS = 20000;
    const EXPANDED_TIMEOUT_MS = 5 * 60 * 1000;
    const WALK_MS = 1600;

    let lastKeyAt = 0;
    window.addEventListener("keydown", () => { lastKeyAt = Date.now(); }, true);

    let current = null; // { promptId, root, host, timer }

    const CSS = `
:host { all: initial; }
.stage { position: fixed; right: 20px; bottom: 16px; z-index: 2147483647; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1f1f1f; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
.stage > * { pointer-events: auto; }
.bot { width: 56px; height: 56px; cursor: pointer; animation: walk-in ${WALK_MS}ms ease-out both, bob 2.4s ${WALK_MS}ms ease-in-out infinite; }
.bot.leave { animation: walk-out ${WALK_MS}ms ease-in forwards; }
@keyframes walk-in { from { transform: translateX(140px); } 60% { transform: translateX(-6px) rotate(-3deg); } to { transform: translateX(0); } }
@keyframes walk-out { to { transform: translateX(160px); opacity: 0; } }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.bubble { background: #fff; border: 1px solid #d9d6f5; border-radius: 12px; padding: 6px 12px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.08);
  opacity: 0; animation: fade 300ms ${WALK_MS}ms forwards; }
@keyframes fade { to { opacity: 1; } }
.card { width: 300px; background: #fff; border: 1px solid #d9d6f5; border-radius: 14px; padding: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.12); }
.q { font-weight: 600; margin: 0 0 10px; }
.opts { display: flex; flex-wrap: wrap; gap: 6px; }
.opt { border: 1px solid #c9c4f0; background: #f6f5fe; color: #3c3489; border-radius: 8px; padding: 6px 9px; cursor: pointer; font: inherit; }
.opt:hover, .opt.sel { background: #7f77dd; color: #fff; border-color: #7f77dd; }
.note { display: none; margin-top: 10px; }
.note.show { display: block; }
.note input { width: 100%; box-sizing: border-box; border: 1px solid #c9c4f0; border-radius: 8px; padding: 6px 8px; font: inherit; }
.row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.send { border: 0; background: #7f77dd; color: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; font: inherit; }
.foot { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; }
.link { background: none; border: 0; padding: 0; color: #6b6b6b; cursor: pointer; font: inherit; font-size: 12px; }
.link:hover { color: #3c3489; text-decoration: underline; }
.thanks { background: #fff; border: 1px solid #d9d6f5; border-radius: 12px; padding: 6px 12px; }
@media (prefers-color-scheme: dark) {
  .stage { color: #eee; }
  .bubble, .card, .thanks { background: #24232b; border-color: #403c6b; }
  .opt { background: #2e2b45; color: #cecbf6; border-color: #403c6b; }
  .note input { background: #1c1b22; color: #eee; border-color: #403c6b; }
  .foot { border-color: #333; }
  .link { color: #a3a3a3; }
}`;

    const BOT_SVG = `<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
  <ellipse cx="28" cy="52" rx="15" ry="3" fill="rgba(0,0,0,.12)"/>
  <rect x="17" y="44" width="7" height="8" rx="3" fill="#534AB7"/><rect x="32" y="44" width="7" height="8" rx="3" fill="#534AB7"/>
  <path d="M8 30 C8 14 18 6 28 6 C38 6 48 14 48 30 C48 42 40 48 28 48 C16 48 8 42 8 30 Z" fill="#7F77DD"/>
  <circle cx="21" cy="26" r="5" fill="#fff"/><circle cx="35" cy="26" r="5" fill="#fff"/>
  <circle cx="22" cy="27" r="2.4" fill="#26215C"/><circle cx="36" cy="27" r="2.4" fill="#26215C"/>
  <path d="M23 36 Q28 40 33 36" stroke="#26215C" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    };

    function send(outcome) {
        if (!current) return;
        const { promptId } = current;
        clearTimeout(current.timer);
        chrome.runtime.sendMessage({ type: "outcome", promptId, outcome }).catch(() => {});
        const goodbye = outcome.kind === "answer" ? "Cảm ơn nhé!" : outcome.reason === "later" ? "Ok, lát nữa nhé." : null;
        leave(goodbye);
    }

    function leave(goodbye) {
        if (!current) return;
        const { root, host } = current;
        current = null;
        const stage = root.querySelector(".stage");
        stage.querySelectorAll(".bubble, .card").forEach((n) => n.remove());
        if (goodbye) stage.prepend(el("div", "thanks", goodbye));
        setTimeout(() => {
            stage.querySelector(".bot")?.classList.add("leave");
            setTimeout(() => host.remove(), WALK_MS);
        }, goodbye ? 1200 : 0);
    }

    function resetTimer(ms) {
        clearTimeout(current.timer);
        current.timer = setTimeout(() => send({ kind: "skip", reason: "none" }), ms);
    }

    function buildCard(question) {
        const card = el("div", "card");
        card.append(el("p", "q", question.text));
        const opts = el("div", "opts");
        const values = question.type === "yesno"
            ? [[1, "Có"], [0, "Không"]]
            : Array.from({ length: question.max - question.min + 1 }, (_, i) => [question.min + i, question.labels?.[i] ?? String(question.min + i)]);
        const note = el("div", "note");
        const input = el("input");
        input.placeholder = question.notePrompt || "Ghi chú (không bắt buộc)";
        input.maxLength = 300;
        const row = el("div", "row");
        const sendBtn = el("button", "send", "Gửi");
        row.append(sendBtn);
        note.append(input, row);
        let chosen = null;

        for (const [value, label] of values) {
            const b = el("button", "opt", question.type === "scale" ? `${value} · ${label}` : label);
            b.addEventListener("click", () => {
                chosen = value;
                if (!question.note) return send({ kind: "answer", value });
                opts.querySelectorAll(".opt").forEach((o) => o.classList.toggle("sel", o === b));
                note.classList.add("show");
                input.focus();
            });
            opts.append(b);
        }
        sendBtn.addEventListener("click", () => chosen !== null && send({ kind: "answer", value: chosen, note: input.value }));
        input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Enter" && chosen !== null) send({ kind: "answer", value: chosen, note: input.value });
        });

        const foot = el("div", "foot");
        for (const [reason, label] of [["later", "Để sau"], ["busy", "Bận, bỏ qua"], ["bad", "Tệ, không muốn nói"], ["today", "Tắt hôm nay"]]) {
            const l = el("button", "link", label);
            l.addEventListener("click", () => send({ kind: "skip", reason }));
            foot.append(l);
        }
        card.append(opts, note, foot);
        card.addEventListener("keydown", (e) => { if (e.key === "Escape") send({ kind: "skip", reason: "later" }); });
        card.addEventListener("pointerdown", () => resetTimer(EXPANDED_TIMEOUT_MS));
        return card;
    }

    function show({ promptId, question, ignoreAfterSeconds }) {
        const host = el("div");
        host.id = "superapp-companion";
        const root = host.attachShadow({ mode: "closed" });
        const style = el("style");
        style.textContent = CSS;
        const stage = el("div", "stage");
        const bubble = el("div", "bubble", "Có 1 câu hỏi nhỏ");
        const bot = el("div", "bot");
        bot.innerHTML = BOT_SVG; // static markup, no data
        bot.title = "Có 1 câu hỏi nhỏ";
        stage.append(bubble, bot);
        root.append(style, stage);
        document.documentElement.append(host);

        current = { promptId, root, host, timer: null };
        resetTimer(ignoreAfterSeconds * 1000);

        const expand = () => {
            if (!current || stage.querySelector(".card")) return;
            bubble.remove();
            stage.prepend(buildCard(question));
            resetTimer(EXPANDED_TIMEOUT_MS);
        };
        bubble.addEventListener("click", expand);
        bot.addEventListener("click", expand);
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === "canShow") {
            sendResponse({
                ok: !current && document.visibilityState === "visible" && !document.fullscreenElement && Date.now() - lastKeyAt > TYPING_QUIET_MS,
            });
        } else if (msg?.type === "show") {
            if (current) return sendResponse({ ok: false });
            show(msg.prompt);
            sendResponse({ ok: true });
        }
        return false;
    });
})();
