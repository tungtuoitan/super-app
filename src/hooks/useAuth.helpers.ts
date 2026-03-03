/**
 * Auth Helper Hook
 * Business logic for authentication operations
 * Pattern: Separate business logic from store (similar to useTagUIHelper)
 */

import { useAuthStore, User } from "@/store/auth/Auth.store";
import { storageService, STORAGE_KEYS } from "@/services/storage.service";
import { authApi } from "@/services/auth.service";
import { userProfileService } from "@/services/userProfile.service";
import { envConfig } from "@/config/env.config";
import { constants } from "@/utils/constants";
import type { LoginRequest } from "@/types/index";
import type { UserFilters, UpdateUserProfileRequest } from "@/types/common.types";
import { useNavigate } from "react-router-dom";
import { extractAuthCodeFromUrl, extractOAuthError, extractStateFromUrl } from "@/utils/googleOAuth";
import { retrieveAndClearPkceValues, validateState } from "@/utils/pkce.utils";
import { useAuthCallbackStore } from "@/store/authCallback/AuthCallback.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import {useGridControlStore} from "@/store/grid/useGridControl.store";
import {useGridAutoRegisterHelper} from "./vsCode/useGridAutoRegister.helper";
import {useConsoleHelper} from "./console/useConsole.helper";

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
    const _console = useConsoleHelper();
    // Get state setters from AuthStore
    const { $user, set$User, setIsAuthenticated, setLoginLoading, setLoginError, setError } = useAuthStore();
    const { uiFilters, setUIFilters, filterViewKey } = useGridControlStore();
    // Navigation and callback store for OAuth flows
    const navigate = useNavigate();
    const { setCallbackError, setIsProcessing } = useAuthCallbackStore();

    /**
     * Attempt to restore session from cached profile + HttpOnly cookie refresh token
     * Called on app mount. Sets user profile immediately for UI, then verifies with backend.
     */
    const initAuthFromStorageToken = async (): Promise<boolean> => {
        const cached = storageService.get<User>(STORAGE_KEYS.USER_PROFILE);
        if (!cached) return false;

        // Show name/avatar immediately while refresh is in-flight
        set$User({ ...cached, userToken: "" });

        try {
            const response = await authApi.refreshToken();
            if (!response.success || !response.user) return false;

            set$User({ ...cached, userToken: response.user.token });
            setIsAuthenticated(true);
            return true;
        } catch {
            storageService.remove(STORAGE_KEYS.USER_PROFILE);
            set$User(DEFAULT_USER);
            return false;
        }
    };

    /**
     * Login with username and password
     */
    const login = async (username: string, password: string): Promise<void> => {
        setLoginLoading(true);
        setLoginError(null);
        setError(null);

        try {
            const loginRequest: LoginRequest = { username, password };
            const response = await authApi.login(loginRequest);

            const userProfile: User = {
                userId: response.userId || null,
                userName: response.username || username,
                email: "",
                password: "",
                userToken: response.token,
                authType: "local",
            };

            // Save profile without token for F5 restore
            storageService.set(STORAGE_KEYS.USER_PROFILE, { ...userProfile, userToken: "" });

            set$User(userProfile);
            setIsAuthenticated(true);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setLoginError(errorMessage);
            setError(errorMessage);

            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            }

            throw err;
        } finally {
            setLoginLoading(false);
        }
    };

    /**
     * Logout user - revoke refresh token, clear cookie, clean up auth state
     */
    const logout = async (): Promise<void> => {
        try { await authApi.logout(); } catch {}

        set$User(DEFAULT_USER);
        setIsAuthenticated(false);
        setError(null);
        setLoginError(null);
        storageService.remove(STORAGE_KEYS.USER_PROFILE);
    };

    /**
     * Login with Google authorization code
     * Exchanges code for JWT token with PKCE
     */
    const loginWithGoogleCode = async (code: string, codeVerifier: string): Promise<void> => {
        setLoginLoading(true);
        setLoginError(null);
        setError(null);

        try {
            const response = await authApi.googleLogin(code, codeVerifier);

            if (!response.success || !response.user) {
                throw new Error(response.error || "Google login failed");
            }

            const parsedFilters = response.user.filters ? JSON.parse(response.user.filters) : constants.filters.defaults;
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

            // Save profile without token for F5 restore
            storageService.set(STORAGE_KEYS.USER_PROFILE, { ...userProfile, userToken: "" });

            set$User(userProfile);
            setIsAuthenticated(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Google login failed";
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
            if (oauthError) {
                setCallbackError(`Authentication cancelled or failed: ${oauthError}`);
                setIsProcessing(false);
                return;
            }

            const code = extractAuthCodeFromUrl(window.location.search);
            const returnedState = extractStateFromUrl(window.location.search);

            if (!code) {
                setCallbackError("No authorization code received from Google");
                setIsProcessing(false);
                return;
            }

            const { codeVerifier, state: storedState } = retrieveAndClearPkceValues();

            if (!validateState(returnedState, storedState)) {
                setCallbackError("Invalid state parameter - possible CSRF attack");
                setIsProcessing(false);
                return;
            }

            if (!codeVerifier) {
                setCallbackError("Missing PKCE code verifier");
                setIsProcessing(false);
                return;
            }

            await loginWithGoogleCode(code, codeVerifier);
            navigate("/", { replace: true });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Authentication failed";
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

    /**
     * Update user filter preferences
     */
    const upsertUserFilters = async (): Promise<void> => {
        try {
            const token = $user.userToken;
            if (!token) {
                throw new Error("User not authenticated");
            }
            const newUserFilters: UserFilters = $user.filters || {};
            newUserFilters[filterViewKey as keyof UserFilters] = uiFilters;

            const payload: UpdateUserProfileRequest = {
                filters: JSON.stringify(newUserFilters),
            };

            const result = await userProfileService._upsertUserProfile(token, payload);
            const newFilters = result.object?.filters;
            if (!result.success) {
                throw new Error(result.message || "Failed to update user filters");
            }

            const updatedUser: typeof $user = {
                ...$user,
                filters: newFilters ? JSON.parse(newFilters) : constants.filters.defaults,
            };
            set$User(updatedUser);

            storageService.set(STORAGE_KEYS.USER_PROFILE, updatedUser);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            _console.error(`Failed to update filters: ${errorMessage}`);
            throw err;
        }
    };

    return {
        login,
        logout,
        loginWithGoogleCode,
        handleOAuthCallback,
        navigateToHome,
        upsertUserFilters,
        initAuthFromStorageToken,
    };
}
