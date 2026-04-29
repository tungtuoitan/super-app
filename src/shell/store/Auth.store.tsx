/**
 * Auth Store
 * React Context store for managing authentication state
 * Pattern: Separate store from business logic (similar to TagUIStore, EditorTabBarStore)
 */

import {UserFilters} from "@/shared";
import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import {User} from "../types/auth.types";



export interface AuthStoreData {
    // Core auth data
    $user: User;
    set$User: Dispatch<SetStateAction<User>>;
    isAuthenticated: boolean;
    setIsAuthenticated: Dispatch<SetStateAction<boolean>>;

    // Auth operation states
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;

    // Login specific states
    loginLoading: boolean;
    setLoginLoading: Dispatch<SetStateAction<boolean>>;
    loginError: string | null;
    setLoginError: Dispatch<SetStateAction<string | null>>;

    // Token exchange states
    tokenExchangeLoading: boolean;
    setTokenExchangeLoading: Dispatch<SetStateAction<boolean>>;
    tokenExchangeError: string | null;
    setTokenExchangeError: Dispatch<SetStateAction<string | null>>;
}

const DEFAULT_AUTH_STATE: User = {
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

const authStoreDefaultValue: AuthStoreData = {
    // Core auth data
    $user: DEFAULT_AUTH_STATE,
    set$User: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},

    // Auth operation states
    loading: false,
    setLoading: () => {},
    error: null,
    setError: () => {},

    // Login specific states
    loginLoading: false,
    setLoginLoading: () => {},
    loginError: null,
    setLoginError: () => {},

    // Token exchange states
    tokenExchangeLoading: false,
    setTokenExchangeLoading: () => {},
    tokenExchangeError: null,
    setTokenExchangeError: () => {},
};

export const AuthStore = createContext<AuthStoreData>(authStoreDefaultValue);

export const useAuthStore = () => useContext(AuthStore);

export const AuthStoreProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Core auth data
    const [$user, set$User] = useState<User>(DEFAULT_AUTH_STATE);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Auth operation states
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Login specific states
    const [loginLoading, setLoginLoading] = useState<boolean>(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    // Token exchange states
    const [tokenExchangeLoading, setTokenExchangeLoading] = useState<boolean>(false);
    const [tokenExchangeError, setTokenExchangeError] = useState<string | null>(null);

    return (
        <AuthStore.Provider
            value={{
                // Core auth data
                $user,
                set$User,
                isAuthenticated,
                setIsAuthenticated,

                // Auth operation states
                loading,
                setLoading,
                error,
                setError,

                // Login specific states
                loginLoading,
                setLoginLoading,
                loginError,
                setLoginError,

                // Token exchange states
                tokenExchangeLoading,
                setTokenExchangeLoading,
                tokenExchangeError,
                setTokenExchangeError,
            }}
        >
            {children}
        </AuthStore.Provider>
    );
};
