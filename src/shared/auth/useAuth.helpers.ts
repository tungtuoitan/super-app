/**
 * Auth Helper Hook
 * Business logic for authentication operations
 * Pattern: Separate business logic from store (similar to useTagUIHelper)
 */

import { useAuthStore } from "./Auth.store";
import type { User } from "./auth.types";
import { storageService } from "../localStorage/storage.service";
import { authApi } from "./auth.service";
import { envConfig } from "config/env.config";
import { constants } from "../constants";
import type { LoginRequest } from "./auth.types";
import { useNavigate } from "react-router-dom";
import { extractAuthCodeFromUrl, extractOAuthError, extractStateFromUrl, GOOGLE_OAUTH_CONFIG } from "./googleOAuth.utils";
import { retrieveAndClearPkceValues, validateState } from "./pkce.utils";
import { useAuthCallbackStore } from "./AuthCallback.store";
import { parseApiError, isUnauthorizedError } from "../fetch/api-error.utils";
import { debugLog } from "../debug/useDebugLog";
import { getDeviceFingerprint } from "../device/deviceFingerprint";
import { scheduleProactiveRefresh } from "../fetch/apiClient";
import {STORAGE_KEYS} from "../localStorage/storage.config";

const DEFAULT_USER: User = {
    userId: null,
    userName: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    picture: "",
    authType: undefined,
    userToken: "",
    filters: {},
};

/**
 * Auth helper hook for authentication operations
 * NO PARAMETERS - Access state via useAuthStore
 * NO useEffect - Components handle timing
 * ONLY function definitions - Return callable functions
 *
 * @returns Object containing auth helper functions
 */
export function useAuthHelper() {
    // Get state setters from AuthStore
    const { $user, set$User, setIsAuthenticated, setLoginLoading, setLoginError, setError } = useAuthStore();
    // Navigation and callback store for OAuth flows
    const navigate = useNavigate();
    const { setCallbackError, setIsProcessing } = useAuthCallbackStore();

    /**
     * Attempt to restore session from cached profile + HttpOnly cookie refresh token
     * Called on app mount. Sets user profile immediately for UI, then verifies with backend.
     */
    const initAuthFromStorageToken = async (): Promise<boolean> => {
        const device = getDeviceFingerprint();
        const cached = storageService.get<User>(STORAGE_KEYS.USER_PROFILE);

        debugLog.log("auth", "init-from-storage-start", {
            hasCachedProfile: !!cached,
            cachedEmail: cached?.email ?? null,
            device,
        });

        if (!cached) {
            debugLog.log("auth", "init-from-storage-skip", { reason: "no-cached-profile", device });
            return false;
        }

        set$User({ ...cached });

        try {
            const response = await authApi.refreshToken();
            if (!response.success || !response.user?.token) {
                throw new Error(response.error || "Refresh failed");
            }

            const parsedFilters = response.user.filters
                ? JSON.parse(response.user.filters)
                : cached.filters;

            const userProfile: User = {
                userId: response.user.id,
                userName: response.user.email || cached.userName || "",
                email: response.user.email || cached.email || "",
                firstName: response.user.firstName ?? cached.firstName,
                lastName: response.user.lastName ?? cached.lastName,
                picture: response.user.picture ?? cached.picture,
                authType: response.user.authType,
                userToken: response.user.token,
                filters: parsedFilters,
            };

            set$User(userProfile);
            storageService.set(STORAGE_KEYS.USER_PROFILE, { ...userProfile, userToken: "" });
            setIsAuthenticated(true);
            scheduleProactiveRefresh(response.user.token);

            debugLog.log("auth", "init-from-storage-ok", { userId: userProfile.userId, email: userProfile.email, device });
            debugLog.flush();
            return true;
        } catch {
            debugLog.log("auth", "init-from-storage-failed", { email: cached.email, device });
            debugLog.flush();
            storageService.remove(STORAGE_KEYS.USER_PROFILE);
            set$User(DEFAULT_USER);
            setIsAuthenticated(false);
            return false;
        }
    };

    /**
     * Login with username and password
     */
    const login = async (username: string, password: string): Promise<void> => {
        const device = getDeviceFingerprint();
        setLoginLoading(true);
        setLoginError(null);
        setError(null);

        debugLog.log("auth", "local-login-attempt", { username, device });

        try {
            const loginRequest: LoginRequest = { username, password };
            const response = await authApi.login(loginRequest);

            if (!response.success || !response.user) {
                throw new Error(response.error || response.message || "Login failed");
            }

            const userProfile: User = {
                userId: response.user.id,
                userName: response.user.email || username,
                email: response.user.email || "",
                firstName: response.user.firstName,
                lastName: response.user.lastName,
                picture: response.user.picture,
                authType: response.user.authType,
                userToken: response.user.token,
            };

            storageService.set(STORAGE_KEYS.USER_PROFILE, { ...userProfile, userToken: "" });
            set$User(userProfile);
            setIsAuthenticated(true);
            scheduleProactiveRefresh(response.user.token);

            debugLog.log("auth", "local-login-store-updated", { userId: userProfile.userId, device });
            debugLog.flush();
        } catch (err) {
            const errorMessage = await parseApiError(err);
            debugLog.log("auth", "local-login-store-error", { error: errorMessage, device });
            debugLog.flush();
            setLoginError(errorMessage);
            setError(errorMessage);
            if (isUnauthorizedError(err)) console.error("Unauthorized. Please login again.");
            throw err;
        } finally {
            setLoginLoading(false);
        }
    };

    /**
     * Logout user - revoke refresh token, clear cookie, clean up auth state
     */
    const logout = async (): Promise<void> => {
        const device = getDeviceFingerprint();
        const userId = $user.userId;
        const email  = $user.email;
        // Capture call site so we can tell WHO triggered logout
        // (user click vs 401 event vs init-from-storage failure)
        const callerStack = new Error("logout-caller").stack ?? "";
        debugLog.log("auth", "logout-start", {
            userId,
            email,
            device,
            pathname: window.location.pathname,
            visibility: document.visibilityState,
            online: navigator.onLine,
            stack: callerStack.split("\n").slice(0, 8).join(" | "),
        });
        debugLog.flush();

        try { await authApi.logout(); } catch {}

        set$User(DEFAULT_USER);
        setIsAuthenticated(false);
        setError(null);
        setLoginError(null);
        storageService.remove(STORAGE_KEYS.USER_PROFILE);

        debugLog.log("auth", "logout-complete", { userId, email, device });
        debugLog.flush();
    };

    /**
     * Login with Google authorization code
     * Exchanges code for JWT token with PKCE
     */
    const loginWithGoogleCode = async (code: string, codeVerifier: string): Promise<void> => {
        const device = getDeviceFingerprint();
        setLoginLoading(true);
        setLoginError(null);
        setError(null);

        debugLog.log("auth", "google-exchange-start", {
            codeLength: code.length,
            hasVerifier: !!codeVerifier,
            redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri,
            device,
        });

        try {
            const response = await authApi.googleLogin(code, codeVerifier);

            if (!response.success || !response.user) {
                debugLog.log("auth", "google-exchange-failed", { error: response.error, success: response.success, device });
                debugLog.flush();
                throw new Error(response.error || "Google login failed");
            }

            debugLog.log("auth", "google-exchange-success", { userId: response.user.id, email: response.user.email, device });
            debugLog.flush();

            if (envConfig.REACT_APP_ENVIRONMENT === "development" && response.user.email === "hoanhtungle@gmail.com") {
                throw new Error("Email hoanhtungle@gmail.com is not allowed in the development environment");
            }

            if (envConfig.REACT_APP_ENVIRONMENT === "production" && response.user.email === "hoanhtungle2@gmail.com") {
                throw new Error("Email hoanhtungle2@gmail.com is not allowed in the production environment");
            }

            const parsedFilters = response.user.filters ? JSON.parse(response.user.filters) : {
                noteGrid: { statusCode: "active", deletedAt: "null" },
                wsGrid: { statusCode: "active", deletedAt: "null" },
                workspace: { statusCode: "active", deletedAt: "null" },
                k: { statusCode: "active", deletedAt: "null" },
                projectGrid: { statusCode: "active" },
                taskGrid: { status: "open,in_progress,background_progress,paused", priority: "low,medium,high" },
            };
            const userProfile: User = {
                userId: response.user.id,
                userName: response.user.email || "",
                email: response.user.email || "",
                firstName: response.user.firstName,
                lastName: response.user.lastName,
                picture: response.user.picture,
                authType: response.user.authType,
                userToken: response.user.token,
                filters: parsedFilters,
            };

            storageService.set(STORAGE_KEYS.USER_PROFILE, { ...userProfile, userToken: "" });
            set$User(userProfile);
            setIsAuthenticated(true);
            scheduleProactiveRefresh(response.user.token);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Google login failed";
            debugLog.log("auth", "google-exchange-exception", { error: errorMessage, device });
            debugLog.flush();
            setLoginError(errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoginLoading(false);
        }
    };

    /**
     * Handle OAuth callback for Google authentication with PKCE validation
     */
    const handleOAuthCallback = async (): Promise<void> => {
        try {
            const oauthError = extractOAuthError(window.location.search);

            debugLog.log("auth", "oauth-callback-start", {
                windowOrigin: window.location.origin,
                windowHref: window.location.href,
                search: window.location.search,
                configuredRedirectUri: GOOGLE_OAUTH_CONFIG.redirectUri,
                envRedirectUri: envConfig.REACT_APP_GOOGLE_REDIRECT_URI,
                oauthError: oauthError ?? undefined,
            });

            if (oauthError) {
                debugLog.log("auth", "oauth-callback-error-from-google", { oauthError });
                debugLog.flush();
                setCallbackError(`Authentication cancelled or failed: ${oauthError}`);
                setIsProcessing(false);
                return;
            }

            const code = extractAuthCodeFromUrl(window.location.search);
            const returnedState = extractStateFromUrl(window.location.search);

            if (!code) {
                debugLog.log("auth", "oauth-callback-no-code", { search: window.location.search });
                debugLog.flush();
                setCallbackError("No authorization code received from Google");
                setIsProcessing(false);
                return;
            }

            const { codeVerifier, state: storedState } = retrieveAndClearPkceValues();

            debugLog.log("auth", "oauth-callback-pkce-check", {
                returnedState,
                storedState,
                hasCodeVerifier: !!codeVerifier,
                stateMatch: returnedState === storedState,
            });

            if (!validateState(returnedState, storedState)) {
                debugLog.log("auth", "oauth-callback-state-mismatch", { returnedState, storedState });
                debugLog.flush();
                setCallbackError("Invalid state parameter - possible CSRF attack");
                setIsProcessing(false);
                return;
            }

            if (!codeVerifier) {
                debugLog.log("auth", "oauth-callback-missing-verifier");
                debugLog.flush();
                setCallbackError("Missing PKCE code verifier");
                setIsProcessing(false);
                return;
            }

            await loginWithGoogleCode(code, codeVerifier);
            navigate("/", { replace: true });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Authentication failed";
            debugLog.log("auth", "oauth-callback-exception", { error: errorMessage });
            debugLog.flush();
            setCallbackError(errorMessage);
            setIsProcessing(false);
        }
    };

    /**
     * Navigate to home page
     */
    const navigateToHome = (): void => {
        navigate("/", { replace: true });
    };


    return {
        login,
        logout,
        loginWithGoogleCode,
        handleOAuthCallback,
        navigateToHome,
        initAuthFromStorageToken,
    };
}


