/**
 * Authentication Service - API communication for auth operations
 * Uses native fetch API without apiClient
 */

import { config } from "@/config/app.config";
import { getLocaleLanguage } from "@/utils/locale";
import type { LoginRequest, LoginResponse, ExchangeTokenResponse, AuthResponse, GoogleCodeRequest } from "@/types/index";

export const authApi = {
    /**
     * Login with username and password
     * POST /api/auth/login
     *
     * @param credentials User login credentials (username and password)
     * @returns Login response with token and user data or rejects with response
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const formData = new FormData();
        formData.append("username", credentials.username);
        formData.append("password", credentials.password);

        const headers = new Headers();
        headers.append("Accept-Language", getLocaleLanguage());

        const options = {
            method: "POST",
            headers: headers,
            body: formData,
        };

        const res = await window.fetch(`${config.api.baseURL}/api/auth/login`, options);

        if (res.ok) {
            const result = (await res.json()) as LoginResponse;
            return result;
        } else {
            return Promise.reject(res);
        }
    },

    /**
     * Google OAuth login
     * Exchange Google authorization code for JWT token
     * POST /api/auth/google/login
     *
     * @param code Google authorization code
     * @returns Auth response with JWT token and user data or rejects with response
     */
    async googleLogin(code: string): Promise<AuthResponse> {
        const request: GoogleCodeRequest = { code };

        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Accept-Language", getLocaleLanguage());

        const options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify(request),
        };

        const res = await window.fetch(`${config.api.baseURL}/api/auth/google/login`, options);

        if (res.ok) {
            const result = (await res.json()) as AuthResponse;
            return result;
        } else {
            return Promise.reject(res);
        }
    },

    /**
     * Exchange authorization code for token
     * POST /api/auth/exchange-token
     *
     * @param code Authorization code from OAuth provider
     * @returns Token exchange response or rejects with response
     */
    async exchangeCodeForToken(code: string): Promise<ExchangeTokenResponse> {
        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Accept-Language", getLocaleLanguage());

        const options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ code }),
        };

        const res = await window.fetch(`${config.api.baseURL}/api/auth/exchange-token`, options);

        if (res.ok) {
            const result = (await res.json()) as ExchangeTokenResponse;
            return result;
        } else {
            return Promise.reject(res);
        }
    },
};
