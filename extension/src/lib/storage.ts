import { STORAGE_KEYS } from "./config";

export interface StoredAuth {
    accessToken: string | null;
    tokenExpiresAt: number | null;
    userEmail: string | null;
    userId: number | null;
}

export async function readAuth(): Promise<StoredAuth> {
    const r = await chrome.storage.local.get([
        STORAGE_KEYS.accessToken,
        STORAGE_KEYS.tokenExpiresAt,
        STORAGE_KEYS.userEmail,
        STORAGE_KEYS.userId,
    ]);
    return {
        accessToken: r[STORAGE_KEYS.accessToken] ?? null,
        tokenExpiresAt: r[STORAGE_KEYS.tokenExpiresAt] ?? null,
        userEmail: r[STORAGE_KEYS.userEmail] ?? null,
        userId: r[STORAGE_KEYS.userId] ?? null,
    };
}

export async function writeAuth(p: Partial<StoredAuth>): Promise<void> {
    const out: Record<string, unknown> = {};
    if (p.accessToken !== undefined) out[STORAGE_KEYS.accessToken] = p.accessToken;
    if (p.tokenExpiresAt !== undefined) out[STORAGE_KEYS.tokenExpiresAt] = p.tokenExpiresAt;
    if (p.userEmail !== undefined) out[STORAGE_KEYS.userEmail] = p.userEmail;
    if (p.userId !== undefined) out[STORAGE_KEYS.userId] = p.userId;
    await chrome.storage.local.set(out);
}

export async function clearAuth(): Promise<void> {
    await chrome.storage.local.remove([
        STORAGE_KEYS.accessToken,
        STORAGE_KEYS.tokenExpiresAt,
        STORAGE_KEYS.userEmail,
        STORAGE_KEYS.userId,
    ]);
}

export function getJwtExpiryMs(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return typeof payload.exp === "number" ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}
