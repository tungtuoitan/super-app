/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * Implements RFC 7636 for OAuth 2.0 security enhancement
 * Used to protect against authorization code interception attacks
 */

/**
 * Storage keys for PKCE values
 * Using sessionStorage for security (cleared when tab closes)
 */
export const PKCE_STORAGE_KEYS = {
    CODE_VERIFIER: "oauth_code_verifier",
    STATE: "oauth_state",
} as const;

/**
 * Generate a cryptographically random code verifier
 * Per RFC 7636: 43-128 characters, URL-safe (A-Z, a-z, 0-9, -, ., _, ~)
 * @returns Random code verifier string (64 characters)
 */
export function generateCodeVerifier(): string {
    const array = new Uint8Array(48); // 48 bytes = 64 base64url chars
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * Per RFC 7636: code_challenge = BASE64URL(SHA256(code_verifier))
 * @param verifier The code verifier string
 * @returns Promise resolving to the code challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Generate a random state parameter for CSRF protection
 * @returns Random state string (32 characters)
 */
export function generateState(): string {
    const array = new Uint8Array(24); // 24 bytes = 32 base64url chars
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

/**
 * Base64 URL-safe encoding (RFC 4648 Section 5)
 * Converts binary data to URL-safe base64 without padding
 * @param buffer Uint8Array to encode
 * @returns Base64 URL-safe encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
    // Convert to standard base64
    let base64 = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        base64 += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(base64);

    // Convert to URL-safe base64 (RFC 4648)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Store PKCE values in sessionStorage
 * @param codeVerifier The code verifier to store
 * @param state The state parameter to store
 */
export function storePkceValues(codeVerifier: string, state: string): void {
    sessionStorage.setItem(PKCE_STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
    sessionStorage.setItem(PKCE_STORAGE_KEYS.STATE, state);
}

/**
 * Retrieve and clear PKCE values from sessionStorage
 * @returns Object containing codeVerifier and state, or null values if not found
 */
export function retrieveAndClearPkceValues(): { codeVerifier: string | null; state: string | null } {
    const codeVerifier = sessionStorage.getItem(PKCE_STORAGE_KEYS.CODE_VERIFIER);
    const state = sessionStorage.getItem(PKCE_STORAGE_KEYS.STATE);

    // Clear after retrieval for security
    sessionStorage.removeItem(PKCE_STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(PKCE_STORAGE_KEYS.STATE);

    return { codeVerifier, state };
}

/**
 * Validate the returned state parameter against stored state
 * @param returnedState State parameter from OAuth callback
 * @param storedState State parameter stored before redirect
 * @returns True if states match, false otherwise
 */
export function validateState(returnedState: string | null, storedState: string | null): boolean {
    if (!returnedState || !storedState) {
        return false;
    }
    return returnedState === storedState;
}
