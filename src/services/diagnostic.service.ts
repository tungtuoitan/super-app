/**
 * Diagnostic Service
 * Fire-and-forget logging to backend for debugging production issues.
 * Never throws, never blocks the caller.
 */

import { config } from "@/config/app.config";

export type DiagnosticPayload = {
    category: string;
    event: string;
    data?: Record<string, unknown>;
};

function buildBaseContext(): Record<string, unknown> {
    return {
        windowOrigin: window.location.origin,
        windowHref: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        clientTimestamp: new Date().toISOString(),
    };
}

export const diagnosticService = {
    /**
     * Send a diagnostic event to the backend.
     * Fire-and-forget: awaiting is optional, errors are swallowed.
     */
    log(payload: DiagnosticPayload): void {
        const body = JSON.stringify({
            ...buildBaseContext(),
            category: payload.category,
            event: payload.event,
            data: payload.data ? JSON.stringify(payload.data) : undefined,
        });
        window
            .fetch(`${config.api.baseURL}/api/diagnostic/log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
                credentials: "include",
            })
            .catch(() => {});
    },
};
