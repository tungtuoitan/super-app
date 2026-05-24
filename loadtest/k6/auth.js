/**
 * auth.js — login helper for k6
 *
 * Uses POST /api/auth/login with form-urlencoded body (matches [FromForm] on BE).
 * Returns { token, userId } or null on failure.
 */

import http from "k6/http";
import { check } from "k6";
import { BASE_URL } from "./config.js";

export function login(username, password) {
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        { username, password },
        {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            tags: { name: "POST /api/auth/login" },
        }
    );

    const ok = check(res, {
        "login 200": (r) => r.status === 200,
    });
    if (!ok) {
        console.error(`login failed for ${username}: ${res.status} ${res.body}`);
        return null;
    }

    let body;
    try { body = res.json(); } catch { return null; }

    const token =
        body?.user?.token ||
        body?.token ||
        null;
    const userId = body?.user?.id ?? body?.userId ?? null;

    if (!token) {
        console.error(`login response missing token for ${username}`);
        return null;
    }
    return { token, userId };
}

export function authHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}
