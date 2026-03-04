/**
 * Authentication Service - API communication for auth operations
 * Uses native fetch API without apiClient
 */

import { config } from "@/config/app.config";
import { getLocaleLanguage } from "@/utils/locale";
import type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest } from "@/types/index";
import { GOOGLE_OAUTH_CONFIG } from "@/utils/googleOAuth";
import { diagnosticService } from "@/services/diagnostic.service";

export const authApi = {
    /**
     * Login with username and password
     * POST /api/auth/login
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
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

        if (res.ok) {
            return (await res.json()) as LoginResponse;
        } else {
            return Promise.reject(res);
        }
    },

    /**
     * Google OAuth login with PKCE support
     * POST /api/auth/google/login
     */
    async googleLogin(code: string, codeVerifier: string): Promise<AuthResponse> {
        diagnosticService.log({ category: "auth", event: "google-callback", data: { codeLength: code.length, codeVerifierLength: codeVerifier?.length, redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri } });
        const request: GoogleCodeRequest = { code, codeVerifier };

        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Accept-Language", getLocaleLanguage());

        const res = await window.fetch(`${config.api.baseURL}/api/auth/google/login`, {
            method: "POST",
            headers,
            body: JSON.stringify(request),
            credentials: "include",
        });

        if (res.ok) {
            return (await res.json()) as AuthResponse;
        } else {
            return Promise.reject(res);
        }
    },

    /**
     * Refresh access token using HttpOnly cookie refresh token
     * POST /api/auth/refresh
     */
    async refreshToken(): Promise<AuthResponse> {
        console.log("[authApi.refreshToken] Calling /api/auth/refresh...");
        const res = await window.fetch(`${config.api.baseURL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });

        console.log("[authApi.refreshToken] Response status:", res.status);
        if (res.ok) {
            return (await res.json()) as AuthResponse;
        } else {
            console.log("[authApi.refreshToken] Failed with status:", res.status, res.statusText);
            diagnosticService.log({ category: "auth", event: "refresh-http-failed", data: { status: res.status, statusText: res.statusText } });
            return Promise.reject(res);
        }
    },

    /**
     * Logout - revoke refresh token and clear cookie
     * POST /api/auth/logout
     */
    async logout(): Promise<void> {
        await window.fetch(`${config.api.baseURL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    },
};
