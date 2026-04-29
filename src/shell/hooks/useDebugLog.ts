/**
 * useDebugLog hook
 * Wraps debugLogStore + provides flush() to send buffered logs to BE.
 *
 * Usage inside a React component / hook:
 *   const { log, flush } = useDebugLog();
 *   log("auth", "google-redirect", { redirectUri });
 *   await flush();   // optional — fires-and-forgets by default
 *
 * Outside React (services, utils):
 *   import { debugLog } from "@/shell";
 *   debugLog.log("auth", "google-redirect", { redirectUri });
 *   debugLog.flush();
 */

import { debugLogStore, type DebugLogEntry } from "@/shared/store/debugLog.store";
import { config } from "@/utils/config/app.config";

const FLUSH_URL = `${config.api.baseURL}/api/diagnostic/logs`;

async function sendBatch(entries: DebugLogEntry[]): Promise<void> {
    await window.fetch(FLUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
        credentials: "include",
    });
}

/** Standalone object — usable outside React tree */
export const debugLog = {
    log(category: string, event: string, data?: Record<string, unknown>): void {
        debugLogStore.add(category, event, data);
    },

    /**
     * Fire-and-forget flush.
     * Drains the buffer and sends to BE. Swallows all errors.
     * Returns the promise for callers that want to await it.
     */
    flush(): Promise<void> {
        const entries = debugLogStore.drain();
        if (entries.length === 0) return Promise.resolve();
        return sendBatch(entries).catch(() => {
            // put entries back so they can be retried later
            entries.forEach((e) => debugLogStore.add(e.category, e.event, { ...e.data, _replayed: true }));
        });
    },
};

/** React hook — thin wrapper, same API */
export function useDebugLog() {
    return debugLog;
}
