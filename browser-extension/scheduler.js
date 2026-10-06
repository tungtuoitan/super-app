/**
 * Scheduler — pure logic, no chrome.* (TungRoot #1485). Decides WHEN to ask and WHICH question,
 * and turns an outcome into a task comment. Unit-tested with `node --test`.
 *
 * State (chrome.storage.local "state"):
 *   day            "YYYY-MM-DD" the counters below belong to
 *   count          prompts resolved today (answer / busy / bad / none) — "later" does not count
 *   lastPromptAt   ms when the last prompt was shown
 *   ignoredStreak  prompts in a row with no reaction → the gap between prompts grows
 *   disabledDay    "YYYY-MM-DD" when the user chose "Tắt hôm nay"
 *   snoozed        { qid, until } after "Để sau"
 *   lastAsked      { qid: "YYYY-MM-DD" } last day each question was resolved
 *   weeklyDone     { qid: weekKey } weekly questions answered (or declined) this week
 *   active         { promptId, qid, shownAt, tabId } prompt on screen right now
 */

export const SKIP_TEXT = {
    busy: "Bận, bỏ qua",
    bad: "Tệ, không muốn nói",
    none: "Không phản hồi",
    today: "Tắt hôm nay",
};

const NOTE_MAX = 300;

// ── Time helpers (local time) ─────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");
export const dayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const minutesOfDay = (ms) => {
    const d = new Date(ms);
    return d.getHours() * 60 + d.getMinutes();
};
/** 1 = Monday … 7 = Sunday */
export const isoWeekday = (ms) => ((new Date(ms).getDay() + 6) % 7) + 1;
/** Monday of the week as "YYYY-MM-DD" */
export const weekKey = (ms) => {
    const d = new Date(ms);
    d.setDate(d.getDate() - (isoWeekday(ms) - 1));
    return dayKey(d.getTime());
};
export const parseHm = (hm) => {
    const [h, m] = String(hm).split(":").map(Number);
    return h * 60 + (m || 0);
};

// ── Question bank ─────────────────────────────────────────────────────────────

const decodeEntities = (s) =>
    s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

/** Pull the JSON code block out of the tracker task description (HTML from the TipTap editor). */
export function parseBank(descriptionHtml) {
    const m = /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/i.exec(descriptionHtml || "");
    if (!m) throw new Error("Không thấy khối JSON bộ câu hỏi trong description");
    const bank = JSON.parse(decodeEntities(m[1]));
    if (!Array.isArray(bank.questions) || bank.questions.length === 0) throw new Error("Bộ câu hỏi rỗng");
    const ids = new Set();
    for (const q of bank.questions) {
        if (!q.id || !q.text || !["scale", "yesno"].includes(q.type)) throw new Error(`Câu hỏi không hợp lệ: ${JSON.stringify(q)}`);
        if (ids.has(q.id)) throw new Error(`Trùng id câu hỏi: ${q.id}`);
        if (q.type === "scale" && (!Number.isInteger(q.min) || !Number.isInteger(q.max) || q.max <= q.min)) throw new Error(`Thang điểm sai: ${q.id}`);
        ids.add(q.id);
    }
    return {
        maxPerDay: 3,
        activeFrom: "08:00",
        activeTo: "22:30",
        minGapMinutes: 120,
        snoozeMinutes: 45,
        ignoreAfterSeconds: 180,
        ...bank,
    };
}

// ── State ─────────────────────────────────────────────────────────────────────

export const emptyState = () => ({
    day: null, count: 0, lastPromptAt: null, ignoredStreak: 0, disabledDay: null,
    snoozed: null, lastAsked: {}, weeklyDone: {}, active: null,
});

/** New day → reset today's counters (history is kept). */
export function rollDay(state, now) {
    const today = dayKey(now);
    if (state.day === today) return state;
    return { ...state, day: today, count: 0, ignoredStreak: 0, snoozed: null };
}

const isEligible = (q, state, now) => {
    const today = dayKey(now);
    if (q.from && minutesOfDay(now) < parseHm(q.from)) return false;
    if (state.lastAsked[q.id] === today) return false;
    if (q.frequency === "weekly") {
        if (isoWeekday(now) < (q.fromWeekday || 1)) return false;
        if (state.weeklyDone[q.id] === weekKey(now)) return false;
    }
    return true;
};

const snoozedDue = (state, now) => (state.snoozed && now >= state.snoozed.until ? state.snoozed.qid : null);

/**
 * Which question to ask now, or null.
 * Order: a snoozed question that is due → one weekly question per day (all remaining on Sunday)
 * → the daily question asked longest ago (later time windows first, they have less time left).
 */
export function pickQuestion(state, bank, now) {
    const byId = new Map(bank.questions.map((q) => [q.id, q]));
    const due = snoozedDue(state, now);
    if (due && byId.has(due)) return byId.get(due);

    const today = dayKey(now);
    const weeklyAskedToday = bank.questions.some((q) => q.frequency === "weekly" && state.lastAsked[q.id] === today);
    const weekly = bank.questions.filter((q) => q.frequency === "weekly" && isEligible(q, state, now));
    if (weekly.length && (!weeklyAskedToday || isoWeekday(now) === 7)) return weekly[0];

    const daily = bank.questions
        .filter((q) => q.frequency !== "weekly" && isEligible(q, state, now))
        .sort((a, b) => (state.lastAsked[a.id] || "").localeCompare(state.lastAsked[b.id] || "")
            || parseHm(b.from || "00:00") - parseHm(a.from || "00:00"));
    return daily[0] || null;
}

/** Gap between prompts grows with every ignored prompt in a row (2h, 4h, 6h, 8h max). */
export const currentGapMinutes = (state, bank) => bank.minGapMinutes * (1 + Math.min(state.ignoredStreak, 3));

/** May a prompt be shown now? `reason` explains a "no" (shown in the popup). */
export function canPrompt(state, bank, now) {
    const today = dayKey(now);
    if (state.active) return { ok: false, reason: "Đang có câu hỏi trên màn hình" };
    if (state.disabledDay === today) return { ok: false, reason: "Đã tắt hôm nay" };
    const t = minutesOfDay(now);
    if (t < parseHm(bank.activeFrom) || t > parseHm(bank.activeTo)) return { ok: false, reason: `Ngoài giờ hỏi (${bank.activeFrom}–${bank.activeTo})` };
    if (state.count >= bank.maxPerDay) return { ok: false, reason: `Đủ ${bank.maxPerDay} câu hôm nay` };
    const snoozeReady = snoozedDue(state, now) !== null;
    const nextAt = state.lastPromptAt ? state.lastPromptAt + currentGapMinutes(state, bank) * 60000 : 0;
    if (!snoozeReady && now < nextAt) return { ok: false, reason: "Chưa tới giờ", nextAt };
    if (!pickQuestion(state, bank, now)) return { ok: false, reason: "Hết câu phù hợp lúc này" };
    return { ok: true };
}

/** Prompt shown on screen. */
export function markShown(state, qid, promptId, tabId, now) {
    return { ...state, active: { promptId, qid, shownAt: now, tabId }, lastPromptAt: now };
}

/**
 * Apply the user's reaction. outcome = { kind: "answer", value, note? } | { kind: "skip", reason }
 * reason: later (snooze, not counted) | busy | bad | none (ignored) | today (stop for today).
 */
export function applyOutcome(state, bank, qid, outcome, now) {
    const today = dayKey(now);
    const q = bank.questions.find((x) => x.id === qid);
    const next = { ...state, active: null, lastAsked: { ...state.lastAsked }, weeklyDone: { ...state.weeklyDone } };
    if (next.snoozed?.qid === qid) next.snoozed = null;

    const reason = outcome.kind === "skip" ? outcome.reason : null;
    if (reason === "later") {
        next.snoozed = { qid, until: now + bank.snoozeMinutes * 60000 };
        next.ignoredStreak = 0;
        return next;
    }
    next.lastAsked[qid] = today;
    if (reason === "today") {
        next.disabledDay = today;
        return next;
    }
    next.count = state.count + 1;
    next.ignoredStreak = reason === "none" ? state.ignoredStreak + 1 : 0;
    if (q?.frequency === "weekly" && (outcome.kind === "answer" || reason === "bad")) next.weeklyDone[qid] = weekKey(now);
    return next;
}

const cleanNote = (note) => String(note || "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);

/** Answer label for a value: scale → labels[value - min]; yesno → Có/Không. */
export function answerLabel(q, value) {
    if (q.type === "yesno") return value ? "Có" : "Không";
    return q.labels?.[value - q.min] ?? String(value);
}

/** Outcome → task comment ({ type, content }) or null when nothing is recorded ("later"). */
export function formatComment(q, outcome) {
    if (outcome.kind === "answer") {
        const note = cleanNote(outcome.note);
        return { type: "track", content: `[${q.id}] ${outcome.value} — ${answerLabel(q, outcome.value)}${note ? ` · ${note}` : ""}` };
    }
    if (outcome.reason === "later") return null;
    return { type: "comment", content: `[${q.id}] skip:${outcome.reason} — ${SKIP_TEXT[outcome.reason] ?? outcome.reason}` };
}

/** Validate an answer coming from the page before trusting it. */
export function isValidAnswer(q, value) {
    if (!Number.isInteger(value)) return false;
    if (q.type === "yesno") return value === 0 || value === 1;
    return value >= q.min && value <= q.max;
}
