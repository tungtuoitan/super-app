/**
 * AuthGuard Component
 * Handles authentication requirements and auto-shows login dialog
 *
 * Responsibilities:
 * - On mount: attempt to restore session from cached profile + HttpOnly cookie
 * - Auto show AccountsDialog if user is not authenticated
 * - Listen for 401 unauthorized events from apiClient interceptor
 * - Prevent unauthorized access to the app
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useActivityBarStore } from "@/store/activityBar/ActivityBar.store";
import { useStandardRegistryHelper } from "@/hooks/index";
import { useAuthHelper } from "@/hooks/useAuth.helpers";
import { configureApiClient } from "@/services/apiClient";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, $user, set$User } = useAuthStore();
    const { setAccountsOpen } = useActivityBarStore();
    const { loadStandardRegistries, loadKeywords } = useStandardRegistryHelper();
    const { initAuthFromStorageToken, logout } = useAuthHelper();

    // Configure apiFetch singleton with token callbacks from AuthStore
    useEffect(() => {
        configureApiClient({
            getToken: () => $user.userToken,
            setToken: (token) => set$User((prev) => ({ ...prev, userToken: token })),
            onAuthFailed: logout,
        });
    }, [$user.userToken]);

    // On mount: try to restore session from HttpOnly cookie + cached profile
    useEffect(() => {
        initAuthFromStorageToken();
    }, []);

    // Listen for 401 events dispatched by apiClient interceptor
    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
            // setAccountsOpen(true);
        };
        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
    }, []);

    // Auto show login dialog when not authenticated
    // useEffect(() => {
    //     if (!isAuthenticated) {
    //         setAccountsOpen(true);
    //     } else {
    //         setAccountsOpen(false);
    //     }
    // }, [isAuthenticated]);

    // Load standard registries and keywords when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadStandardRegistries();
            loadKeywords();
        }
    }, [isAuthenticated]);

    return <>{children}</>;
}
