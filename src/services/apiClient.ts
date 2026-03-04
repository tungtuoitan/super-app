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
    try {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = authApi
                .refreshToken()
                .then((r) => {
                    if (!r.success || !r.user?.token) throw new Error("Refresh failed");
                    return r.user.token;
                })
                .finally(() => {
                    isRefreshing = false;
                });
        }

        const newToken = await refreshPromise!;
        setToken(newToken);

        const retryHeaders = new Headers(options.headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return window.fetch(url, { ...options, headers: retryHeaders, credentials: "include" });
    } catch {
        refreshPromise = null;
        isRefreshing = false;
        onAuthFailed();
        window.dispatchEvent(new Event("auth:unauthorized"));
        return response;
    }
}
