import {
    API_BASE_URL,
    GOOGLE_AUTH_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_SCOPE,
} from "./config";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";
import { clearAuth, getJwtExpiryMs, readAuth, writeAuth } from "./storage";

interface GoogleLoginResponse {
    success: boolean;
    message?: string;
    user?: {
        id: number;
        email: string;
        token: string;
    };
}

interface RefreshResponse {
    success: boolean;
    user?: {
        id: number;
        email: string;
        token: string;
    };
}

function getRedirectUri(): string {
    return chrome.identity.getRedirectURL();
}

function buildAuthUrl(codeChallenge: string, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GOOGLE_SCOPE,
        access_type: "offline",
        prompt: "consent",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function launchAuthFlow(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirected) => {
            if (chrome.runtime.lastError || !redirected) {
                reject(new Error(chrome.runtime.lastError?.message || "Auth flow cancelled"));
                return;
            }
            resolve(redirected);
        });
    });
}

export async function signInWithGoogle(): Promise<{ email: string; userId: number }> {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error("VITE_GOOGLE_CLIENT_ID is not configured");
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    const redirectUri = getRedirectUri();
    const authUrl = buildAuthUrl(codeChallenge, state, redirectUri);

    const redirected = await launchAuthFlow(authUrl);
    const params = new URL(redirected).searchParams;
    const code = params.get("code");
    const returnedState = params.get("state");
    const error = params.get("error");

    if (error) throw new Error(`Google OAuth error: ${error}`);
    if (!code) throw new Error("No authorization code returned");
    if (returnedState !== state) throw new Error("OAuth state mismatch");

    const res = await fetch(`${API_BASE_URL}/api/auth/google/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, codeVerifier, redirectUri }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`SuperApp login failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as GoogleLoginResponse;
    if (!data.success || !data.user?.token) {
        throw new Error(data.message || "SuperApp login returned no token");
    }

    const expiresAt = getJwtExpiryMs(data.user.token) ?? Date.now() + 15 * 60 * 1000;
    await writeAuth({
        accessToken: data.user.token,
        tokenExpiresAt: expiresAt,
        userEmail: data.user.email,
        userId: data.user.id,
    });

    return { email: data.user.email, userId: data.user.id };
}

export async function signOut(): Promise<void> {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch {
        /* ignore network errors on logout */
    }
    await clearAuth();
}

export async function refreshAccessToken(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });
    if (!res.ok) {
        await clearAuth();
        throw new Error(`Refresh failed (${res.status})`);
    }
    const data = (await res.json()) as RefreshResponse;
    if (!data.success || !data.user?.token) {
        await clearAuth();
        throw new Error("Refresh returned no token");
    }
    const expiresAt = getJwtExpiryMs(data.user.token) ?? Date.now() + 15 * 60 * 1000;
    await writeAuth({
        accessToken: data.user.token,
        tokenExpiresAt: expiresAt,
        userEmail: data.user.email,
        userId: data.user.id,
    });
    return data.user.token;
}

/** Return a usable access token, refreshing if it expires within 60s. */
export async function getValidAccessToken(): Promise<string> {
    const auth = await readAuth();
    if (!auth.accessToken) throw new Error("Not signed in");
    if (auth.tokenExpiresAt && auth.tokenExpiresAt - Date.now() > 60_000) {
        return auth.accessToken;
    }
    return refreshAccessToken();
}

export async function isSignedIn(): Promise<boolean> {
    const auth = await readAuth();
    return !!auth.accessToken;
}
