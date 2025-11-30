/**
 * Auth Helper Hook
 * Business logic for authentication operations
 * Pattern: Separate business logic from store (similar to useTagUIHelper)
 */

import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth/AuthStore';
import { storageService, STORAGE_KEYS } from '@/services/storage.service';
import type { LoginRequest, ExchangeTokenResponse } from '@/types/index';

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
    const { 
        setAuth, 
        setIsAuthenticated,
        setLoginLoading, 
        setLoginError,
        setTokenExchangeLoading,
        setTokenExchangeError,
        setError 
    } = useAuthStore();

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
            storageService.setString(STORAGE_KEYS.USER_TOKEN, response.token);

            // Update auth store (never store passwords)
            setAuth({
                userName: username,
                password: '', // Never store actual passwords
                userToken: response.token,
            });

            setIsAuthenticated(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed';
            setLoginError(errorMessage);
            setError(errorMessage);
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
        setAuth({
            userName: '',
            password: '',
            userToken: '',
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
                storageService.setString(STORAGE_KEYS.USER_TOKEN, response.access_token);
                
                // Update auth store
                setAuth(prev => ({
                    ...prev,
                    userToken: response.access_token,
                }));
                
                setIsAuthenticated(true);
            }

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Token exchange failed';
            setTokenExchangeError(errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setTokenExchangeLoading(false);
        }
    };

    return {
        login,
        logout,
        exchangeToken,
    };
}