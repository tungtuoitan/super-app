// 1x1 transparent PNG as data URL — chrome.notifications requires iconUrl.
const PLACEHOLDER_ICON =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Show a notification. Tries 3 channels in order:
 *  1. chrome.notifications (system tray) — most reliable
 *  2. inject toast div into the active tab via chrome.scripting (fallback)
 *  3. console log (last resort)
 */
export async function showToastInTab(
    tabId: number | undefined,
    message: string,
    variant: "success" | "error" = "success",
): Promise<void> {
    const title = variant === "error" ? "SuperApp — error" : "SuperApp";
    console.log(`[SuperApp][${variant}] ${message}`);

    // 1) System notification — always visible
    try {
        if (chrome.notifications?.create) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: PLACEHOLDER_ICON,
                title,
                message,
                priority: variant === "error" ? 2 : 1,
            }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("notifications.create:", chrome.runtime.lastError.message);
                }
            });
        }
    } catch (e) {
        console.warn("notifications failed:", e);
    }

    // 2) In-page toast (best-effort; skipped on chrome:// pages)
    if (tabId === undefined) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            args: [message, variant],
            func: (msg: string, kind: "success" | "error") => {
                const HOST_ID = "__superapp_toast_host__";
                let host = document.getElementById(HOST_ID);
                if (!host) {
                    host = document.createElement("div");
                    host.id = HOST_ID;
                    Object.assign(host.style, {
                        position: "fixed",
                        top: "16px",
                        right: "16px",
                        zIndex: "2147483647",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        pointerEvents: "none",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                    } as Partial<CSSStyleDeclaration>);
                    document.documentElement.appendChild(host);
                }
                const t = document.createElement("div");
                Object.assign(t.style, {
                    background: kind === "error" ? "#dc2626" : "#16a34a",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 4px 14px rgba(0,0,0,.2)",
                    maxWidth: "320px",
                    wordBreak: "break-word",
                    transition: "opacity .2s, transform .2s",
                    opacity: "0",
                    transform: "translateY(-6px)",
                    pointerEvents: "auto",
                } as Partial<CSSStyleDeclaration>);
                t.textContent = msg;
                host.appendChild(t);
                requestAnimationFrame(() => {
                    t.style.opacity = "1";
                    t.style.transform = "translateY(0)";
                });
                setTimeout(() => {
                    t.style.opacity = "0";
                    t.style.transform = "translateY(-6px)";
                    setTimeout(() => t.remove(), 250);
                }, 3000);
            },
        });
    } catch (e) {
        console.warn("scripting.executeScript failed:", e);
    }
}
