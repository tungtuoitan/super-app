/**
 * Time spent on Facebook / Instagram (TungRoot #1512, tracker #1511). Pure functions — no chrome.*,
 * so they run under `node --test`. background.js samples once a minute: if the browser window is
 * focused, the user is not idle and the active tab is one of SITES, the time since the previous
 * sample is credited to that site. One comment per day per device, updated in place.
 *
 * Usage state (chrome.storage.local "usage"):
 *   day           "YYYY-MM-DD" the counters belong to
 *   sec           { facebook, instagram, messenger } seconds today
 *   lastSampleAt  ms of the previous sample (any site or none)
 *   firstAt       ms of the first sample today → comment occurredAt
 *   commentId     id of today's comment on the tracker (null until the first successful post)
 *   reportedText  content last sent; reportedAt ms it was sent
 */

import { dayKey } from "./scheduler.js";

/** A gap longer than this between samples (worker asleep, PC suspended) credits only this much. */
export const MAX_CREDIT_MS = 90 * 1000;
/** Re-send today's comment at most this often while the number changes. */
export const REPORT_EVERY_MS = 10 * 60 * 1000;

const KEYS = ["facebook", "instagram", "messenger"];

const hostIs = (host, domain) => host === domain || host.endsWith(`.${domain}`);

/** "facebook" | "instagram" | "messenger" | null. Messenger is measured but kept out of the FB number. */
export function siteOf(url) {
    let u;
    try {
        u = new URL(url);
    } catch {
        return null;
    }
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    if (hostIs(host, "messenger.com")) return "messenger";
    if (hostIs(host, "facebook.com")) return /^\/messages(\/|$)/.test(u.pathname) ? "messenger" : "facebook";
    if (hostIs(host, "instagram.com")) return "instagram";
    return null;
}

export const emptyUsage = (now) => ({
    day: dayKey(now), sec: { facebook: 0, instagram: 0, messenger: 0 },
    lastSampleAt: null, firstAt: now, commentId: null, reportedText: null, reportedAt: 0,
});

/**
 * One sample. `site` = siteOf(active tab) when the window is focused and the user is active, else null.
 * Returns { usage, closed } — `closed` is the previous day's state when the day rolled over (so it
 * can get a final report), otherwise null.
 */
export function sample(usage, now, site) {
    let closed = null;
    let u = usage ?? emptyUsage(now);
    if (u.day !== dayKey(now)) {
        closed = u;
        u = emptyUsage(now);
    }
    if (site && KEYS.includes(site) && u.lastSampleAt != null && dayKey(u.lastSampleAt) === u.day) {
        const credit = Math.max(0, Math.min(now - u.lastSampleAt, MAX_CREDIT_MS));
        u = { ...u, sec: { ...u.sec, [site]: u.sec[site] + credit / 1000 } };
    }
    return { usage: { ...u, lastSampleAt: now }, closed };
}

const min = (s) => Math.round(s / 60);

/** Comment content, e.g. "[fb_ins] FB 42' · Ins 13' · tổng 55' · Messenger 8' (không tính) · máy nhà · đo tự động" */
export function formatUsage(usage, device) {
    const fb = min(usage.sec.facebook);
    const ig = min(usage.sec.instagram);
    const parts = [`[fb_ins] FB ${fb}'`, `Ins ${ig}'`, `tổng ${fb + ig}'`];
    if (min(usage.sec.messenger) > 0) parts.push(`Messenger ${min(usage.sec.messenger)}' (không tính)`);
    if (device) parts.push(device);
    parts.push("đo tự động");
    return parts.join(" · ");
}

/** Send now? Only when the text changed, and not more often than REPORT_EVERY_MS unless forced (day close). */
export function shouldReport(usage, text, now, force = false) {
    if (text === usage.reportedText) return false;
    return force || now - usage.reportedAt >= REPORT_EVERY_MS;
}
