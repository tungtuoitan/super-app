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
 *
 * Uses Web Crypto when available (secure context: HTTPS or localhost).
 * Falls back to a pure-JS SHA-256 in insecure contexts (e.g. LAN IP over HTTP)
 * so dev/test on a phone via Wi-Fi still works.
 *
 * @param verifier The code verifier string
 * @returns Promise resolving to the code challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);

    if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
        const digest = await crypto.subtle.digest("SHA-256", data);
        return base64UrlEncode(new Uint8Array(digest));
    }

    return base64UrlEncode(sha256Fallback(data));
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
 * Pure-JS SHA-256 (FIPS 180-4). Used as fallback when WebCrypto is unavailable
 * (e.g. http:// LAN IP origins are not secure contexts and `crypto.subtle` is undefined).
 * Returns a 32-byte digest.
 */
function sha256Fallback(message: Uint8Array): Uint8Array {
    const K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);

    const H = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);

    // Pre-processing: pad message to multiple of 512 bits
    const bitLen = message.length * 8;
    const padLen = (message.length + 9 + 63) & ~63; // align to 64-byte block
    const padded = new Uint8Array(padLen);
    padded.set(message);
    padded[message.length] = 0x80;
    // 64-bit big-endian length at the end
    const view = new DataView(padded.buffer);
    view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000));
    view.setUint32(padLen - 4, bitLen >>> 0);

    const W = new Uint32Array(64);
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

    for (let block = 0; block < padLen; block += 64) {
        for (let i = 0; i < 16; i++) {
            W[i] = view.getUint32(block + i * 4);
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
            const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
        }

        let a = H[0], b = H[1], c = H[2], d = H[3];
        let e = H[4], f = H[5], g = H[6], h = H[7];

        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const mj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + mj) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }

        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
        H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0;
        H[7] = (H[7] + h) >>> 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) {
        outView.setUint32(i * 4, H[i]);
    }
    return out;
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
