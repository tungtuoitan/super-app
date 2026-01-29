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
import type { LoginRequest, ExchangeTokenResponse } from "@/types/index";
import type { UserFilters, UpdateUserProfileRequest } from "@/types/common.types";
import { useLocation, useNavigate } from "react-router-dom";
import { extractAuthCodeFromUrl, extractOAuthError, extractStateFromUrl } from "@/utils/googleOAuth";
import { retrieveAndClearPkceValues, validateState } from "@/utils/pkce.utils";
import { useAuthCallbackStore } from "@/store/authCallback/AuthCallback.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";
import {useGridControlStore} from "@/store/grid/useGridControl.store";
import {useGridAutoRegisterHelper} from "./vsCode/useGridAutoRegister.helper";
import {useConsoleHelper} from "./console/useConsole.helper";

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
    const { $user, set$User, setIsAuthenticated, setLoginLoading, setLoginError, setTokenExchangeLoading, setTokenExchangeError, setError } = useAuthStore();
    const { uiFilters, setUIFilters, filterViewKey } = useGridControlStore();
    // Navigation and callback store for OAuth flows
    const navigate = useNavigate();
    const { setCallbackError, setIsProcessing } = useAuthCallbackStore();

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

            // Save token to localStorage
            // storageService.setString(STORAGE_KEYS.USER_TOKEN, response.token);

            // Update auth store (never store passwords)
            set$User({
                userId: response.userId || null,
                userName: response.username || username,
                email: "", // Email not provided in login response
                password: "", // Never store actual passwords
                userToken: response.token,
                authType: "local",
            });

            setIsAuthenticated(true);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setLoginError(errorMessage);
            setError(errorMessage);

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            }

            throw err;
        } finally {
            setLoginLoading(false);
        }
    };

    /**
     * Logout user and clean up auth state
     */
    const logout = (): void => {
        // Clear auth store state
        set$User({
            userId: null,
            userName: "",
            email: "",
            firstName: "",
            lastName: "",
            picture: "",
            authType: undefined,
            userToken: "",
            filters: undefined,
        });
        setIsAuthenticated(false);

        // Clear any errors
        setError(null);
        setLoginError(null);
        setTokenExchangeError(null);

        // Remove token and profile from storage
        storageService.remove(STORAGE_KEYS.USER_TOKEN);
        storageService.remove(STORAGE_KEYS.USER_PROFILE);
    };

    /**
     * Exchange authorization code for token
     */
    const exchangeToken = async (code: string): Promise<ExchangeTokenResponse> => {
        setTokenExchangeLoading(true);
        setTokenExchangeError(null);
        setError(null);

        try {
            const response = await authApi.exchangeCodeForToken(code);

            // Save token to localStorage
            if (response.access_token) {
                // storageService.setString(STORAGE_KEYS.USER_TOKEN, response.access_token);

                // Update auth store
                set$User((prev) => ({
                    ...prev,
                    userToken: response.access_token,
                }));

                setIsAuthenticated(true);
            }

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Token exchange failed";
            setTokenExchangeError(errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setTokenExchangeLoading(false);
        }
    };

    /**
     * Login with Google authorization code
     * Exchanges code for JWT token with PKCE support
     * @param code Authorization code from Google
     * @param codeVerifier PKCE code verifier (optional for backward compatibility)
     */
    const loginWithGoogleCode = async (code: string, codeVerifier?: string): Promise<void> => {
        setLoginLoading(true);
        setLoginError(null);
        setError(null);

        try {
            const response = await authApi.googleLogin(code, codeVerifier);

            if (!response.success || !response.user) {
                throw new Error(response.error || "Google login failed");
            }


            // Parse filters if they exist
            const parsedFilters = response.user.filters ? JSON.parse(response.user.filters) : constants.filters.defaults;
            // Prepare user profile object
            const userProfile = {
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

            // In dev environment, save to localStorage
            if (envConfig.NODE_ENV === constants.environments.development) {
                storageService.setString(STORAGE_KEYS.USER_TOKEN, response.user.token);
                storageService.set(STORAGE_KEYS.USER_PROFILE, userProfile);
            }

            // Update auth store with full user info including filters
            set$User(userProfile as User);

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
            // Check for OAuth error
            const oauthError = extractOAuthError(window.location.search);
            if (oauthError) {
                setCallbackError(`Authentication cancelled or failed: ${oauthError}`);
                setIsProcessing(false);
                return;
            }

            // Extract authorization code and state from URL
            const code = extractAuthCodeFromUrl(window.location.search);
            const returnedState = extractStateFromUrl(window.location.search);

            if (!code) {
                setCallbackError("No authorization code received from Google");
                setIsProcessing(false);
                return;
            }

            // Retrieve and clear PKCE values from sessionStorage
            const { codeVerifier, state: storedState } = retrieveAndClearPkceValues();

            // Validate state parameter (CSRF protection)
            if (!validateState(returnedState, storedState)) {
                setCallbackError("Invalid state parameter - possible CSRF attack");
                setIsProcessing(false);
                return;
            }

            // Exchange code for JWT token with PKCE code verifier
            await loginWithGoogleCode(code, codeVerifier || undefined);

            // Navigate to home page on success
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

    const initAuthFromStorageToken = (): boolean => {
        if (envConfig.NODE_ENV === constants.environments.development) {
            const token = storageService.getString(STORAGE_KEYS.USER_TOKEN);
            const userProfile = storageService.get(STORAGE_KEYS.USER_PROFILE);

            if (token && userProfile) {
                // Restore full auth state from stored token and profile
                const _userProfile = userProfile as User;
                if(!_userProfile.filters) {
                    _userProfile.filters = constants.filters.defaults;
                }
                set$User(_userProfile);
                setIsAuthenticated(true);
                return true;
            } else if (token) {
                // Fallback: if only token exists (old behavior)
                set$User((prev) => ({
                    ...prev,
                    userToken: token,
                    filters: constants.filters.defaults,
                }));
                setIsAuthenticated(true);
                return true;
            }
        }

        return false;
    };

    /**
     * Update user filter preferences
     * Syncs filter changes to backend and updates local state
     * Uses UpsertUserProfile endpoint with only filters field populated
     */
    const upsertUserFilters = async (): Promise<void> => {
        try {
            // Get token from user state
            const token = $user.userToken;
            if (!token) {
                throw new Error("User not authenticated");
            }
            const newUserFilters: UserFilters = $user.filters || {};
            newUserFilters[filterViewKey as keyof UserFilters] = uiFilters;

            // Merge existing filters with new filters

            // Prepare payload: only filters field, other fields are undefined (won't be updated)
            const payload: UpdateUserProfileRequest = {
                filters: JSON.stringify(newUserFilters), // Convert UserFilters object to JSON string
            };

            // Update backend - will upsert profile if not exists
            const result = await userProfileService._upsertUserProfile(token, payload);
            const newFilters = result.object?.filters;
            if (!result.success) {
                throw new Error(result.message || "Failed to update user filters");
            }

            // Update local state
            const updatedUser: typeof $user = {
                ...$user,
                filters: newFilters ? JSON.parse(newFilters) : constants.filters.defaults,
            };
            set$User(updatedUser);

            // In dev environment, update localStorage with new filters
            if (envConfig.NODE_ENV === constants.environments.development) {
                storageService.set(STORAGE_KEYS.USER_PROFILE, updatedUser);
            }
        } catch (err) {
            const errorMessage = await parseApiError(err);
            _console.error(`Failed to update filters: ${errorMessage}`);
            throw err;
        }
    };

    return {
        login,
        logout,
        exchangeToken,
        loginWithGoogleCode,
        handleOAuthCallback,
        navigateToHome,
        initAuthFromStorageToken,
        upsertUserFilters,
    };
}
