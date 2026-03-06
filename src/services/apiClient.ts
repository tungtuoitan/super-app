/**
 * API Client with silent refresh interceptor
 * Handles 401 responses by refreshing the access token and retrying
 * Uses singleton pattern to prevent race conditions
 */

import { authApi } from "@/services/auth.service";
import { debugLog } from "@/hooks/debugLog/useDebugLog";
import { getDeviceFingerprint } from "@/utils/deviceFingerprint";

type ApiClientConfig = {
    getToken: () => string;
    setToken: (token: string) => void;
    onAuthFailed: () => void;
};

let _config: ApiClientConfig | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

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
        window.dispatchEvent(new Event("auth:special-success"));

        const retryHeaders = new Headers(options.headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        debugLog.log("apiClient", "retry-with-new-token", { url, device });
        return window.fetch(url, { ...options, headers: retryHeaders, credentials: "include" });
    } catch {
        refreshPromise = null;
        isRefreshing = false;
        debugLog.log("apiClient", "auth-failed", { url, device });
        debugLog.flush();
        onAuthFailed();
        window.dispatchEvent(new Event("auth:unauthorized"));
        return response;
    }
}
