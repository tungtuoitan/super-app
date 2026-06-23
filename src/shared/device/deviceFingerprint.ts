/**
 * Device fingerprint utility
 * Produces a stable, short identifier for the current browser/device
 * based on publicly available, non-PII browser properties.
 *
 * Format: "<platform>/<browser>/<screenRes>/<lang>/<tz>"
 * Example: "Win32/Chrome-145/1920x1080/vi/Asia-Ho_Chi_Minh"
 */

function getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes("Edg/"))    return `Edge-${ua.match(/Edg\/([\d.]+)/)?.[1]?.split(".")[0] ?? "?"}`;
    if (ua.includes("Chrome/")) return `Chrome-${ua.match(/Chrome\/([\d.]+)/)?.[1]?.split(".")[0] ?? "?"}`;
    if (ua.includes("Firefox/"))return `Firefox-${ua.match(/Firefox\/([\d.]+)/)?.[1]?.split(".")[0] ?? "?"}`;
    if (ua.includes("Safari/") && !ua.includes("Chrome/")) return `Safari-${ua.match(/Version\/([\d.]+)/)?.[1]?.split(".")[0] ?? "?"}`;
    return "Unknown";
}

function getTimezone(): string {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/\//g, "-"); }
    catch { return "unknown-tz"; }
}

export function getDeviceFingerprint(): string {
    const platform = navigator.platform || "unknown-platform";
    const browser  = getBrowser();
    const screen   = `${window.screen.width}x${window.screen.height}`;
    const lang     = navigator.language?.split("-")[0] ?? "unknown";
    const tz       = getTimezone();
    return `${platform}/${browser}/${screen}/${lang}/${tz}`;
}

const DEVICE_ID_KEY = "deviceId";

/** Returns a stable UUID for this browser. Created once and persisted to localStorage. */
export function getOrCreateDeviceId(): string {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const id = typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
}
