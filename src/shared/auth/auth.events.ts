/**
 * Auth — Custom DOM Event definitions
 *
 * Events dispatched by the API client interceptor and consumed by AuthGuard.
 * Using DOM events here (rather than a Zustand store) keeps the apiClient
 * free of React / store dependencies — it's a plain async function module.
 */

// ── 1. Event name constants ────────────────────────────────────────────────

export const authEvents = {
    /** Fired when a token refresh fails and the user must re-authenticate */
    unauthorized: "auth:unauthorized",
    /** Fired when a silent token refresh succeeds (used for debug logging) */
    specialSuccess: "auth:special-success",
} as const;

// ── 2. WindowEventMap augmentation ────────────────────────────────────────

declare global {
    interface WindowEventMap {
        "auth:unauthorized":    Event;
        "auth:special-success": Event;
    }
}

// ── 3. Typed dispatch helpers ──────────────────────────────────────────────

export const dispatchAuthUnauthorized = () => {
    window.dispatchEvent(new Event(authEvents.unauthorized));
};

export const dispatchAuthSpecialSuccess = () => {
    window.dispatchEvent(new Event(authEvents.specialSuccess));
};
