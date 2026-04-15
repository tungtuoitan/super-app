/**
 * Authentication Service - API communication for auth operations
 * Uses native fetch API without apiClient
 */

import { config } from "@/config/app.config";
import { getLocaleLanguage } from "@/utils/locale";
import type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest } from "@/types/index";
import { debugLog } from "@/shell/hooks/useDebugLog";
import { getDeviceFingerprint } from "@/utils/deviceFingerprint";

export const authApi = {
    /**
     * Login with username and password
     * POST /api/auth/login
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const device = getDeviceFingerprint();
        debugLog.log("auth", "local-login-start", { username: credentials.username, device });

        const formData = new FormData();
        formData.append("username", credentials.username);
        formData.append("password", credentials.password);

        const headers = new Headers();
        headers.append("Accept-Language", getLocaleLanguage());

        const res = await window.fetch(`${config.api.baseURL}/api/auth/login`, {
            method: "POST",
            headers,
            body: formData,
            credentials: "include",
        });

        debugLog.log("auth", "local-login-response", { status: res.status, ok: res.ok, device });

        if (res.ok) {
            const data = (await res.json()) as LoginResponse;
            debugLog.log("auth", "local-login-success", { userId: data.userId, device });
            debugLog.flush();
            return data;
        } else {
            let errorBody: unknown;
            try { errorBody = await res.clone().json(); } catch { errorBody = await res.clone().text(); }
            debugLog.log("auth", "local-login-error", { status: res.status, body: errorBody, device });
            debugLog.flush();
            return Promise.reject(res);
        }
    },

    /**
     * Google OAuth login with PKCE support
     * POST /api/auth/google/login
     */
    async googleLogin(code: string, codeVerifier: string): Promise<AuthResponse> {
        const device = getDeviceFingerprint();
        const request: GoogleCodeRequest = { code, codeVerifier };
        debugLog.log("auth", "google-login-start", { codeLength: code.length, hasVerifier: !!codeVerifier, device });

        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Accept-Language", getLocaleLanguage());

        const res = await window.fetch(`${config.api.baseURL}/api/auth/google/login`, {
            method: "POST",
            headers,
            body: JSON.stringify(request),
            credentials: "include",
        });

        debugLog.log("auth", "google-login-response", { status: res.status, ok: res.ok, device });

        if (res.ok) {
            const data = (await res.json()) as AuthResponse;
            debugLog.log("auth", "google-login-success", { userId: data.user?.id, email: data.user?.email, device });
            debugLog.flush();
            return data;
        } else {
            let errorBody: unknown;
            try { errorBody = await res.clone().json(); } catch { errorBody = await res.clone().text(); }
            debugLog.log("auth", "google-login-error", { status: res.status, body: errorBody, device });
            debugLog.flush();
            return Promise.reject(res);
        }
    },

    /**
     * Refresh access token using HttpOnly cookie refresh token
     * POST /api/auth/refresh
     */
    async refreshToken(): Promise<AuthResponse> {
        const device = getDeviceFingerprint();
        debugLog.log("auth", "refresh-start", { device });

        const res = await window.fetch(`${config.api.baseURL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });

        debugLog.log("auth", "refresh-response", { status: res.status, ok: res.ok, device });

        if (res.ok) {
            const data = (await res.json()) as AuthResponse;
            debugLog.log("auth", "refresh-ok", {
                success: data.success,
                hasUser: !!data.user,
                hasToken: !!data.user?.token,
                userId: data.user?.id,
                device,
            });
            return data;
        } else {
            let errorBody: unknown;
            try { errorBody = await res.clone().json(); } catch { errorBody = await res.clone().text(); }
            debugLog.log("auth", "refresh-error", { status: res.status, body: errorBody, device });
            debugLog.flush();
            return Promise.reject(res);
        }
    },

    /**
     * Logout - revoke refresh token and clear cookie
     * POST /api/auth/logout
     */
    async logout(): Promise<void> {
        const device = getDeviceFingerprint();
        debugLog.log("auth", "logout-start", { device });

        const res = await window.fetch(`${config.api.baseURL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

        debugLog.log("auth", "logout-response", { status: res.status, ok: res.ok, device });
        debugLog.flush();
    },
};
