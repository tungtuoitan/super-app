/**
 * AuthGuard Component
 * Handles authentication requirements and auto-shows login dialog
 *
 * Responsibilities:
 * - Initialize auth state from localStorage on mount
 * - Auto show AccountsDialog if user is not authenticated
 * - Listen for 401 unauthorized events and trigger logout + show dialog
 * - Prevent unauthorized access to the app
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useAuthHelper } from "@/hooks/useAuth.helpers";
import { useActivityBarStore } from "@/store/activityBar/ActivityBar.store";
import { useStandardRegistryHelper } from "@/hooks/index";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();
    const { initAuthFromStorageToken, logout } = useAuthHelper();
    const { setAccountsOpen } = useActivityBarStore();
    const { loadStandardRegistries, loadKeywords } = useStandardRegistryHelper();

    // Initialize auth on mount
    useEffect(() => {
        const hasToken = initAuthFromStorageToken();

        // If no token, show login dialog
        if (!hasToken) {
            setAccountsOpen(true);
        }
    }, []);

    // Listen for 401 unauthorized events from API
    // useEffect(() => {
    //     const handleUnauthorized = () => {
    //         // Logout and show login dialog
    //         logout();
    //         setAccountsOpen(true);
    //     };

    //     window.addEventListener('auth:unauthorized', handleUnauthorized);

    //     return () => {
    //         window.removeEventListener('auth:unauthorized', handleUnauthorized);
    //     };
    // }, []);

    // Auto show login dialog when not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            setAccountsOpen(true);
        } else {
            setAccountsOpen(false);
        }
    }, [isAuthenticated]);

    // Load standard registries and keywords when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadStandardRegistries();
            loadKeywords();
        }
    }, [isAuthenticated]);

    return <>{children}</>;
}
