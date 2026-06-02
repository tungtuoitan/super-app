/**
 * PKCE helpers — ported from src/shared/auth/pkce.utils.ts.
 * Standalone copy so the extension can build independently of the web app.
 */

function base64UrlEncode(buffer: Uint8Array): string {
    let str = "";
    for (let i = 0; i < buffer.byteLength; i++) str += String.fromCharCode(buffer[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
    const a = new Uint8Array(48);
    crypto.getRandomValues(a);
    return base64UrlEncode(a);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
}

export function generateState(): string {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return base64UrlEncode(a);
}
