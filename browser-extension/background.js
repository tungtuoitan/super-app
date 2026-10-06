/**
 * Background service worker (TungRoot #1485).
 * Every 2 minutes: send queued answers, then — if a prompt is allowed — ask the active tab whether
 * the bot may appear (visible, user not typing) and show one question. All decisions live in
 * scheduler.js; this file only wires chrome.* APIs, storage and the SuperApp API.
 */

import {
    applyOutcome, canPrompt, emptyState, formatComment, isValidAnswer, markShown, parseBank, pickQuestion, rollDay,
} from "./scheduler.js";
import { NeedLoginError, fetchTrackerDescription, postComment } from "./api.js";

const DEFAULT_SETTINGS = { apiBase: "https://www.tungle.uk", trackerTaskId: 1486 };
const TICK_MINUTES = 2;
const BANK_REFRESH_MS = 6 * 3600 * 1000;
/** Prompt still "active" this long after it should have timed out → the tab died, count as no reaction */
const STALE_GRACE_MS = 2 * 60 * 1000;
/** Only show the bot when the computer has had input within this many seconds */
const IDLE_SECONDS = 60;

// ── Storage ───────────────────────────────────────────────────────────────────

const getSettings = async () => ({ ...DEFAULT_SETTINGS, ...(await chrome.storage.sync.get("settings")).settings });
const getLocal = async () => {
    const { state, bank, bankLoadedAt, queue, lastError } = await chrome.storage.local.get(["state", "bank", "bankLoadedAt", "queue", "lastError"]);
    return { state: state ?? emptyState(), bank: bank ?? null, bankLoadedAt: bankLoadedAt ?? 0, queue: queue ?? [], lastError: lastError ?? null };
};
const setLocal = (patch) => chrome.storage.local.set(patch);

// ── Question bank + queue ─────────────────────────────────────────────────────

async function loadBank(force = false) {
    const { bank, bankLoadedAt } = await getLocal();
    if (bank && !force && Date.now() - bankLoadedAt < BANK_REFRESH_MS) return bank;
    const { apiBase, trackerTaskId } = await getSettings();
    try {
        const fresh = parseBank(await fetchTrackerDescription(apiBase, trackerTaskId));
        await setLocal({ bank: fresh, bankLoadedAt: Date.now(), lastError: null });
        return fresh;
    } catch (e) {
        await setLocal({ lastError: e instanceof NeedLoginError ? "needLogin" : String(e.message ?? e) });
        return bank; // keep the cached bank when offline / not logged in
    }
}

/** Send queued comments in order; stop at the first network/auth failure (retry next tick). */
async function flushQueue() {
    const { queue } = await getLocal();
    if (!queue.length) return;
    const { apiBase } = await getSettings();
    const rest = [...queue];
    while (rest.length) {
        try {
            await postComment(apiBase, rest[0]);
            rest.shift();
        } catch (e) {
            if (e instanceof NeedLoginError || !e.status || e.status >= 500) {
                await setLocal({ queue: rest, lastError: e instanceof NeedLoginError ? "needLogin" : String(e.message ?? e) });
                return;
            }
            rest.shift(); // 4xx: the item itself is bad — drop it, keep the rest
            await setLocal({ lastError: String(e.message ?? e) });
        }
    }
    await setLocal({ queue: rest, lastError: null });
}

async function record(question, outcome, now) {
    const comment = formatComment(question, outcome);
    if (!comment) return;
    const { trackerTaskId } = await getSettings();
    const { queue } = await getLocal();
    await setLocal({ queue: [...queue, { taskId: trackerTaskId, ...comment, occurredAt: new Date(now).toISOString() }] });
    await flushQueue();
}

// ── Prompt flow ───────────────────────────────────────────────────────────────

async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab?.id ? tab : null;
}

const ask = (tabId, message) => chrome.tabs.sendMessage(tabId, message).catch(() => null);

/**
 * Ask the tab whether the bot may appear. Chrome only auto-injects content scripts into pages loaded
 * after the extension was installed/reloaded, so inject on demand when nobody answers.
 * null = the browser forbids extensions on this page (new tab, chrome://, extension store, PDF…).
 */
async function reachTab(tabId) {
    const ready = await ask(tabId, { type: "canShow" });
    if (ready) return ready;
    try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    } catch {
        return null;
    }
    return ask(tabId, { type: "canShow" });
}

/** Show a question in the active tab. `force` (popup "Hỏi thử ngay") skips the timing rules. */
async function tryPrompt({ force = false } = {}) {
    const now = Date.now();
    const bank = await loadBank();
    if (!bank) return { ok: false, reason: "Chưa có bộ câu hỏi" };
    let { state } = await getLocal();
    state = rollDay(state, now);

    if (!force) {
        const allowed = canPrompt(state, bank, now);
        if (!allowed.ok) return allowed;
        if ((await chrome.idle.queryState(IDLE_SECONDS)) !== "active") return { ok: false, reason: "Máy đang rảnh / khoá" };
    } else if (state.active) {
        return { ok: false, reason: "Đang có câu hỏi trên màn hình" };
    }

    const tab = await activeTab();
    if (!tab) return { ok: false, reason: "Không có tab" };
    const ready = await reachTab(tab.id);
    if (!ready) return { ok: false, reason: "Trình duyệt không cho extension chạy ở trang này (tab mới, chrome://, edge://, cửa hàng extension, PDF…). Mở một trang web thường rồi thử lại." };
    if (!ready.ok && !force) return { ok: false, reason: "Đang gõ / tab không hiển thị" };

    const question = pickQuestion(state, bank, now) ?? (force ? bank.questions[0] : null);
    if (!question) return { ok: false, reason: "Hết câu phù hợp lúc này" };
    const promptId = `${now}-${question.id}`;
    state = markShown(state, question.id, promptId, tab.id, now);
    await setLocal({ state });
    const shown = await ask(tab.id, { type: "show", prompt: { promptId, question, ignoreAfterSeconds: bank.ignoreAfterSeconds } });
    if (!shown?.ok) {
        await setLocal({ state: { ...state, active: null } });
        return { ok: false, reason: "Không hiện được bot trên trang này" };
    }
    return { ok: true };
}

async function resolve(promptId, outcome) {
    const now = Date.now();
    const { state, bank } = await getLocal();
    if (!bank || state.active?.promptId !== promptId) return { ok: false };
    const question = bank.questions.find((q) => q.id === state.active.qid);
    if (!question) return { ok: false };
    if (outcome.kind === "answer" && !isValidAnswer(question, outcome.value)) return { ok: false };
    if (outcome.kind === "skip" && !["later", "busy", "bad", "none", "today"].includes(outcome.reason)) return { ok: false };
    await setLocal({ state: applyOutcome(rollDay(state, now), bank, question.id, outcome, now) });
    await record(question, outcome, now);
    return { ok: true };
}

/** The tab showing a prompt was closed / navigated / crashed → treat as no reaction. */
async function expireStalePrompt() {
    const { state, bank } = await getLocal();
    if (!state.active || !bank) return;
    if (Date.now() - state.active.shownAt > bank.ignoreAfterSeconds * 1000 + STALE_GRACE_MS) {
        await resolve(state.active.promptId, { kind: "skip", reason: "none" });
    }
}

async function tick() {
    await flushQueue();
    await expireStalePrompt();
    await tryPrompt();
}

// ── Popup status ──────────────────────────────────────────────────────────────

async function status() {
    const now = Date.now();
    const { state: raw, bank, bankLoadedAt, queue, lastError } = await getLocal();
    const state = rollDay(raw, now);
    const settings = await getSettings();
    return {
        settings,
        lastError,
        queueLength: queue.length,
        bank: bank ? { count: bank.questions.length, version: bank.version ?? null, loadedAt: bankLoadedAt, maxPerDay: bank.maxPerDay } : null,
        today: { count: state.count, disabled: state.disabledDay === state.day, ignoredStreak: state.ignoredStreak },
        next: bank ? canPrompt(state, bank, now) : null,
    };
}

// ── Wiring ────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("tick", { periodInMinutes: TICK_MINUTES });
    loadBank(true);
});
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("tick", { periodInMinutes: TICK_MINUTES }));
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "tick") tick();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const handlers = {
        outcome: () => resolve(msg.promptId, msg.outcome),
        status: () => status(),
        askNow: () => tryPrompt({ force: true }),
        refreshBank: async () => ({ ok: !!(await loadBank(true)) }),
        setDisabledToday: async () => {
            const { state } = await getLocal();
            const s = rollDay(state, Date.now());
            await setLocal({ state: { ...s, disabledDay: msg.disabled ? s.day : null } });
            return { ok: true };
        },
        saveSettings: async () => {
            await chrome.storage.sync.set({ settings: { ...(await getSettings()), ...msg.settings } });
            await chrome.storage.session.clear();
            return { ok: !!(await loadBank(true)) };
        },
    };
    const handler = handlers[msg?.type];
    if (!handler) return false;
    Promise.resolve(handler()).then(sendResponse, (e) => sendResponse({ ok: false, reason: String(e?.message ?? e) }));
    return true; // async response
});
