/**
 * API Client with silent refresh interceptor
 * Handles 401 responses by refreshing the access token and retrying
 * Uses singleton pattern to prevent race conditions
 *
 * Usage:
 *   1. Call configureApiClient() once inside a component that has access to AuthStore
 *   2. Call apiFetch(url, options) from any service - token is injected automatically
 */

import { authApi } from "@/services/auth.service";
import { diagnosticService } from "@/services/diagnostic.service";

type ApiClientConfig = {
    getToken: () => string;
    setToken: (token: string) => void;
    onAuthFailed: () => void;
};

let _config: ApiClientConfig | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const AUTH_ENDPOINTS = ["/api/auth/", "/api/diagnostic/"];

function isAuthEndpoint(input: RequestInfo | URL): boolean {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return AUTH_ENDPOINTS.some((e) => url.includes(e));
}

/**
 * Configure the API client with token callbacks.
 * Must be called once inside a component that has access to AuthStore.
 */
export function configureApiClient(config: ApiClientConfig): void {
    _config = config;
}

/**
 * Fetch wrapper that auto-refreshes the access token on 401.
 * Token is injected automatically from the configured getToken().
 * Falls back to plain window.fetch if not yet configured (e.g. auth endpoints).
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!_config) {
        return window.fetch(url, options);
    }

    const { getToken, setToken, onAuthFailed } = _config;
    const token = getToken();

    const headers = new Headers(options.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await window.fetch(url, { ...options, headers, credentials: "include" });

    if (response.status !== 401 || isAuthEndpoint(url)) {
        return response;
    }

    // --- 401: try silent refresh ---
    const hasToken = !!token;
    console.log("[apiFetch] 401 received for:", url, "| isRefreshing:", isRefreshing, "| hasToken:", hasToken);
    diagnosticService.log({ category: "auth", event: "401-received", data: { url, isRefreshing, hasToken } });

    try {
        if (!isRefreshing) {
            isRefreshing = true;
            console.log("[apiFetch] Starting token refresh...");
            refreshPromise = authApi
                .refreshToken()
                .then((r) => {
                    console.log("[apiFetch] refreshToken response:", { success: r.success, hasToken: !!r.user?.token, error: r.error });
                    if (!r.success || !r.user?.token) {
                        diagnosticService.log({ category: "auth", event: "refresh-response-invalid", data: { success: r.success, hasToken: !!r.user?.token, error: r.error } });
                        throw new Error("Refresh failed");
                    }
                    return r.user.token;
                })
                .finally(() => {
                    isRefreshing = false;
                });
        } else {
            console.log("[apiFetch] Refresh already in progress, waiting...");
        }

        const newToken = await refreshPromise!;
        console.log("[apiFetch] Refresh succeeded, retrying:", url);
        diagnosticService.log({ category: "auth", event: "token-refresh-success", data: { url } });
        setToken(newToken);

        const retryHeaders = new Headers(options.headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return window.fetch(url, { ...options, headers: retryHeaders, credentials: "include" });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log("[apiFetch] Refresh FAILED:", err, "| url:", url);
        diagnosticService.log({ category: "auth", event: "token-refresh-failed", data: { url, error: errMsg } });
        refreshPromise = null;
        isRefreshing = false;
        onAuthFailed();
        window.dispatchEvent(new Event("auth:unauthorized"));
        return response;
    }
}
