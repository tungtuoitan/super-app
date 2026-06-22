/**
 * API Client with silent refresh interceptor
 * Handles 401 responses by refreshing the access token and retrying
 * Uses singleton pattern to prevent race conditions
 */

import { getDeviceFingerprint } from "../device/deviceFingerprint";
import { authApi } from "../auth/auth.service";
import { debugLog } from "../debug/useDebugLog";
import { dispatchAuthUnauthorized, dispatchAuthSpecialSuccess } from "../auth/auth.events";

type ApiClientConfig = {
    getToken: () => string;
    setToken: (token: string) => void;
    onAuthFailed: () => void;
};

let _config: ApiClientConfig | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

/** Parse JWT exp claim → ms timestamp, returns null if unreadable */
function getTokenExpiryMs(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return typeof payload.exp === "number" ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

/**
 * Schedule a proactive refresh ~60s before the token expires.
 * Call this whenever a new access token is stored.
 * Cancels any pending timer from the previous token.
 */
export function scheduleProactiveRefresh(token: string): void {
    if (proactiveTimer) clearTimeout(proactiveTimer);
    proactiveTimer = null;
    if (!_config) return;

    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return;

    const delay = expiryMs - Date.now() - 60_000; // refresh 60s early
    if (delay <= 0) return; // already expired or too close — let 401 handle it

    proactiveTimer = setTimeout(async () => {
        const device = getDeviceFingerprint();
        debugLog.log("apiClient", "proactive-refresh-fire", {
            visibility: document.visibilityState,
            online: navigator.onLine,
            device,
        });
        try {
            const newToken = await acquireRefreshToken();
            _config?.setToken(newToken);
            scheduleProactiveRefresh(newToken); // chain to next expiry
            debugLog.log("apiClient", "proactive-refresh-done", { device });
            debugLog.flush();
        } catch (err) {
            debugLog.log("apiClient", "proactive-refresh-failed", { error: String(err), device });
            debugLog.flush();
            // refresh token exhausted — 401 interceptor will handle the next request
        }
    }, delay);
}

const AUTH_ENDPOINTS = ["/api/auth/", "/api/diagnostic/"];

function isAuthEndpoint(url: string): boolean {
    return AUTH_ENDPOINTS.some((e) => url.includes(e));
}

function buildRefreshPromise(): Promise<string> {
    const device = getDeviceFingerprint();
    return authApi
        .refreshToken()
        .then((r) => {
            if (!r.success || !r.user?.token) {
                debugLog.log("apiClient", "refresh-invalid-response", {
                    success: r.success,
                    hasToken: !!r.user?.token,
                    device,
                });
                throw new Error("Refresh failed");
            }
            debugLog.log("apiClient", "refresh-complete", { userId: r.user?.id, device });
            return r.user.token;
        })
        .catch((err) => {
            debugLog.log("apiClient", "refresh-error", { error: String(err), device });
            debugLog.flush();
            throw err;
        })
        .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });
}

/**
 * Shared refresh lock — used by both 401 interceptor and initAuthFromStorageToken.
 * Guarantees only one /api/auth/refresh call is in-flight at a time.
 */
export function acquireRefreshToken(): Promise<string> {
    const device = getDeviceFingerprint();
    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = buildRefreshPromise();
        debugLog.log("apiClient", "refresh-lock-acquired", { device });
    } else {
        debugLog.log("apiClient", "refresh-lock-queued", { device });
    }
    return refreshPromise!;
}

export function configureApiClient(config: ApiClientConfig): void {
    _config = config;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!_config) {
        return window.fetch(url, options);
    }

    const { getToken, setToken, onAuthFailed } = _config;
    const token = getToken();

    const headers = new Headers(options.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await window.fetch(url, { ...options, headers, credentials: "include" });

    if (response.status !== 401 || isAuthEndpoint(url)) {
        return response;
    }

    // ── 401 intercepted ──────────────────────────────────────────────────────
    const device = getDeviceFingerprint();
    debugLog.log("apiClient", "401-intercepted", {
        url,
        isRefreshing,
        hasRefreshPromise: !!refreshPromise,
        device,
    });

    try {
        const newToken = await acquireRefreshToken();
        setToken(newToken);
        dispatchAuthSpecialSuccess();

        const retryHeaders = new Headers(options.headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        debugLog.log("apiClient", "retry-with-new-token", { url, device });
        return window.fetch(url, { ...options, headers: retryHeaders, credentials: "include" });
    } catch {
        refreshPromise = null;
        isRefreshing = false;
        debugLog.log("apiClient", "auth-failed", { url, device });
        debugLog.flush();

        // Don't trigger logout during OAuth callback — exchange is still in progress
        if (!window.location.pathname.includes("/auth/callback")) {
            onAuthFailed();
            dispatchAuthUnauthorized();
        } else {
            debugLog.log("apiClient", "auth-failed-suppressed-oauth", { url, device });
        }
        return response;
    }
}
