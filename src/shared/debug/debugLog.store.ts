/**
 * Debug Log Store
 * In-memory ring buffer for debug log entries.
 * Designed to be used outside React (module-level singleton) so it works
 * in services, utils, and hooks alike.
 *
 * Usage:
 *   import { debugLogStore } from "@/store/debugLog/debugLog.store";
 *   debugLogStore.add("auth", "google-redirect", { redirectUri: "..." });
 *   const logs = debugLogStore.drain(); // returns all + clears
 */

export interface DebugLogEntry {
    id: number;
    timestamp: string;       // ISO string, client time
    category: string;
    event: string;
    data?: Record<string, unknown>;
    // device snapshot captured at log time
    windowOrigin: string;
    windowHref: string;
    userAgent: string;
}

const MAX_ENTRIES = 200;
let _seq = 0;
const _entries: DebugLogEntry[] = [];

function snapshot(): Pick<DebugLogEntry, "windowOrigin" | "windowHref" | "userAgent"> {
    return {
        windowOrigin: window.location.origin,
        windowHref: window.location.href,
        userAgent: navigator.userAgent,
    };
}

export const debugLogStore = {
    /** Add one entry to the in-memory buffer. */
    add(category: string, event: string, data?: Record<string, unknown>): void {
        const entry: DebugLogEntry = {
            id: ++_seq,
            timestamp: new Date().toISOString(),
            category,
            event,
            data,
            ...snapshot(),
        };
        _entries.push(entry);
        // keep buffer bounded
        if (_entries.length > MAX_ENTRIES) {
            _entries.splice(0, _entries.length - MAX_ENTRIES);
        }
        // Mirror to console only when explicitly enabled — printing on every log
        // tanks performance when DevTools is open (each console.log is a
        // structured-clone + render in DevTools). Toggle with:
        //   window.__DEBUG_LOG_CONSOLE = true
        if ((window as unknown as { __DEBUG_LOG_CONSOLE?: boolean }).__DEBUG_LOG_CONSOLE) {
            // eslint-disable-next-line no-console
            console.log(`[${category}] ${event}`, data ?? "");
        }
    },

    /** Return all entries without clearing. */
    getAll(): DebugLogEntry[] {
        return [..._entries];
    },

    /** Return all entries AND clear the buffer. */
    drain(): DebugLogEntry[] {
        const copy = [..._entries];
        _entries.length = 0;
        return copy;
    },

    /** Peek at count of buffered entries. */
    size(): number {
        return _entries.length;
    },
};
