/**
 * API Client with silent refresh interceptor
 * Handles 401 responses by refreshing the access token and retrying
 * Uses singleton pattern to prevent race conditions
 */

import { authApi } from "@/services/auth.service";

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Fetch wrapper that auto-refreshes the access token on 401
 *
 * @param url - Request URL
 * @param options - Fetch options (without Authorization header - it is injected)
 * @param getToken - Function to get the current access token
 * @param setToken - Function to store the new access token after refresh
 * @param onAuthFailed - Called when refresh fails (trigger logout + show login)
 */
export async function apiFetch(
    url: string,
    options: RequestInit,
    getToken: () => string,
    setToken: (token: string) => void,
    onAuthFailed: () => void
): Promise<Response> {
    const token = getToken();

    const headers = new Headers(options.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await window.fetch(url, { ...options, headers, credentials: "include" });

    if (response.status !== 401) {
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
