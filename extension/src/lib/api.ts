import { API_BASE_URL } from "./config";
import { getValidAccessToken, refreshAccessToken } from "./auth";

const AUTH_ENDPOINT_PREFIXES = ["/api/auth/"];

function isAuthEndpoint(url: string): boolean {
    return AUTH_ENDPOINT_PREFIXES.some((p) => url.includes(p));
}

/**
 * Fetch with bearer token + 401-retry once after refresh.
 * Mirrors src/shared/fetch/apiClient.ts:apiFetch but standalone for the extension.
 *
 * TODO RESTORE: re-require sign-in. Currently if no token is stored we send the
 * request unauthenticated — BE has [Authorize] disabled on /api/design/* in dev.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

    let token: string | null = null;
    try {
        token = await getValidAccessToken();
    } catch {
        // Dev: no token, fall through and send unauthenticated.
    }

    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(url, { ...init, headers, credentials: "include" });
    if (res.status !== 401 || isAuthEndpoint(url) || !token) return res;

    const fresh = await refreshAccessToken();
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("Authorization", `Bearer ${fresh}`);
    return fetch(url, { ...init, headers: retryHeaders, credentials: "include" });
}
