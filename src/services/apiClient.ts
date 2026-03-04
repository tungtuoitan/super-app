/**
 * API Client with silent refresh interceptor
 * Handles 401 responses by refreshing the access token and retrying
 * Uses singleton pattern to prevent race conditions
 */

import { authApi } from "@/services/auth.service";
import { diagnosticService } from "@/services/diagnostic.service";

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
