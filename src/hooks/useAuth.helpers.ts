/**
 * Auth Helper Hook
 * Business logic for authentication operations
 * Pattern: Separate business logic from store (similar to useTagUIHelper)
 */

import { useAuthStore } from "@/store/auth/Auth.store";
import { storageService, STORAGE_KEYS } from "@/services/storage.service";
import { authApi } from "@/services/auth.service";
import { envConfig } from "@/config/env.config";
import { constants } from "@/utils/constants";
import type { LoginRequest, ExchangeTokenResponse } from "@/types/index";
import { useNavigate } from "react-router-dom";
import { extractAuthCodeFromUrl, extractOAuthError } from "@/utils/googleOAuth";
import { useAuthCallbackStore } from "@/store/authCallback/AuthCallback.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useSnackbar } from "notistack";

/**
 * Auth helper hook for authentication operations
 * NO PARAMETERS - Access state via useAuthStore
 * NO useEffect - Components handle timing
 * ONLY function definitions - Return callable functions
 *
 * @returns Object containing auth helper functions
 */
export function useAuthHelper() {
    const { enqueueSnackbar } = useSnackbar();
    // Get state setters from AuthStore
    const { set$User, setIsAuthenticated, setLoginLoading, setLoginError, setTokenExchangeLoading, setTokenExchangeError, setError } = useAuthStore();

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
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
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
        });
        setIsAuthenticated(false);

        // Clear any errors
        setError(null);
        setLoginError(null);
        setTokenExchangeError(null);

        // Remove token from storage
        storageService.remove(STORAGE_KEYS.USER_TOKEN);
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
     * Exchanges code for JWT token
     */
    const loginWithGoogleCode = async (code: string): Promise<void> => {
        setLoginLoading(true);
        setLoginError(null);
        setError(null);

        try {
            const response = await authApi.googleLogin(code);

            if (!response.success || !response.user) {
                throw new Error(response.error || "Google login failed");
            }

            // Save token to localStorage
            storageService.setString(STORAGE_KEYS.USER_TOKEN, response.user.token);

            // Update auth store with full user info
            set$User({
                userId: response.user.id,
                userName: response.user.email || "",
                email: response.user.email || "",
                firstName: response.user.firstName,
                lastName: response.user.lastName,
                picture: response.user.picture,
                authType: response.user.authType,
                userToken: response.user.token,
            });

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
     * Handle OAuth callback for Google authentication
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

            // Extract authorization code
            const code = extractAuthCodeFromUrl(window.location.search);

            if (!code) {
                setCallbackError("No authorization code received from Google");
                setIsProcessing(false);
                return;
            }

            // Exchange code for JWT token
            await loginWithGoogleCode(code);

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
        const token = storageService.getString(STORAGE_KEYS.USER_TOKEN);

        if (envConfig.NODE_ENV === constants.environments.development && token) {
            // Restore auth state from stored token
            set$User((prev) => ({
                ...prev,
                userToken: token,
            }));
            setIsAuthenticated(true);
            return true;
        }

        return false;
    };

    return {
        login,
        logout,
        exchangeToken,
        loginWithGoogleCode,
        handleOAuthCallback,
        navigateToHome,
        initAuthFromStorageToken,
    };
}
