/**
 * Authentication Context - Compatibility Layer
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * New code should use:
 * - useAuthStore() for state access
 * - useAuthHelper() for business logic
 * 
 * Pattern: Store + Helper (similar to TagUI and ContextMenu)
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import {useAuthStore, User} from '../store';
import {useAuthHelper} from '../hooks/useAuthHelpers';

/**
 * Authentication context interface (Legacy)
 */
export interface AuthContextValue {
    // State
    auth: User;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    loginLoading: boolean;
    loginError: string | null;
    
    // Actions
    setAuth: React.Dispatch<React.SetStateAction<User>>;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    exchangeToken: (code: string) => Promise<any>;
}

/**
 * Legacy provider - no longer needed but kept for backward compatibility
 * The actual provider is AuthStoreProvider in Main.tsx
 */
export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
    return <>{children}</>;
};

/**
 * Backward compatible hook that combines store and helper
 * Prefer using useAuthStore() and useAuthHelper() directly in new code
 */
export function useAuth(): AuthContextValue {
    // Get state from store
    const {
        auth,
        setAuth,
        isAuthenticated,
        loading,
        error,
        loginLoading,
        loginError,
    } = useAuthStore();
    
    // Get actions from helper
    const {
        login,
        logout,
        exchangeToken,
    } = useAuthHelper();
    
    return {
        // State
        auth,
        isAuthenticated,
        loading,
        error,
        loginLoading,
        loginError,
        
        // Actions
        setAuth,
        login,
        logout,
        exchangeToken,
    };
}


