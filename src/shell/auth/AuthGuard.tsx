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
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { debugLog } from "@/shell/hooks/useDebugLog";
import { getDeviceFingerprint } from "@/utils/deviceFingerprint";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, $user, set$User } = useAuthStore();
    const { setAccountsOpen } = useActivityBarStore();
    const { loadStandardRegistries, loadKeywords } = useStandardRegistryHelper();
    const { initAuthFromStorageToken, logout } = useAuthHelper();
    const _console = useConsoleHelper();

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
        const device = getDeviceFingerprint();
        debugLog.log("auth", "authguard-mount", { device, isAuthenticated });
        initAuthFromStorageToken().then((restored) => {
            debugLog.log("auth", "authguard-init-done", { restored, device });
            debugLog.flush();
        });
    }, []);

    // Listen for 401 events dispatched by apiClient interceptor
    useEffect(() => {
        const handleUnauthorized = () => {
            const device = getDeviceFingerprint();
            debugLog.log("auth", "authguard-unauthorized-event", { device });
            debugLog.flush();
            logout();
        };
        const handleRefreshSuccess = () => {
            const device = getDeviceFingerprint();
            debugLog.log("auth", "authguard-refresh-success-event", { device });
            _console.specialSuccess("Token refreshed successfully.");
        };
        window.addEventListener("auth:unauthorized", handleUnauthorized);
        window.addEventListener("auth:special-success", handleRefreshSuccess);
        return () => {
            window.removeEventListener("auth:unauthorized", handleUnauthorized);
            window.removeEventListener("auth:special-success", handleRefreshSuccess);
        };
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
