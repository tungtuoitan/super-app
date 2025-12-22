/**
 * AuthCallback UI Context
 * Minimal UI state management for AuthCallback page
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';

export interface AuthCallbackContextData {
    // Processing state
    isProcessing: boolean;
    setIsProcessing: Dispatch<SetStateAction<boolean>>;

    // Error state
    callbackError: string | null;
    setCallbackError: Dispatch<SetStateAction<string | null>>;
}

export const authCallbackContextDefaultValue: AuthCallbackContextData = {
    // Processing state
    isProcessing: true,
    setIsProcessing: () => {},

    // Error state
    callbackError: null,
    setCallbackError: () => {},
};

const AuthCallbackContext = createContext<AuthCallbackContextData>(authCallbackContextDefaultValue);

export const useAuthCallbackStore = () => {
    const ctx = useContext(AuthCallbackContext);
    if (!ctx) {
        throw new Error('useAuthCallbackStore must be used within AuthCallbackProvider');
    }
    return ctx;
};

export const AuthCallbackProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Processing state
    const [isProcessing, setIsProcessing] = useState(true);

    // Error state
    const [callbackError, setCallbackError] = useState<string | null>(null);

    return (
        <AuthCallbackContext.Provider
            value={{
                // Processing state
                isProcessing,
                setIsProcessing,

                // Error state
                callbackError,
                setCallbackError,
            }}
        >
            {children}
        </AuthCallbackContext.Provider>
    );
};