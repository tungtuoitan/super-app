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
import { getDeviceFingerprint } from "../device/deviceFingerprint";
import { useStandardRegistryHelper } from "../standardRegistry/useStandardRegistry.helper";
import { configureApiClient, acquireRefreshToken, scheduleProactiveRefresh } from "../fetch/apiClient";
import {useAuthHelper} from "./useAuth.helpers";
import {useAuthStore} from "./Auth.store";
import { debugLog } from "../debug/useDebugLog"
import {useKeywordHelper} from "../keyword/useKeyword.helper";
import { authEvents } from "./auth.events";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, $user, set$User } = useAuthStore();
    const { loadStandardRegistries } = useStandardRegistryHelper();
    const { loadKeywords } = useKeywordHelper();
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
        const device = getDeviceFingerprint();
        debugLog.log("auth", "authguard-mount", { device, isAuthenticated });
        initAuthFromStorageToken().then((restored) => {
            debugLog.log("auth", "authguard-init-done", { restored, device });
            debugLog.flush();
        });
    }, []);

    // Proactive refresh when user returns to tab after idle
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState !== "visible") return;
            const token = $user.userToken;
            if (!token) return;
            // If less than 5 minutes left, refresh now instead of waiting for 401
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                const expiryMs: number = payload.exp * 1000;
                if (expiryMs - Date.now() < 5 * 60_000) {
                    acquireRefreshToken()
                        .then((newToken) => {
                            set$User((prev) => ({ ...prev, userToken: newToken }));
                            scheduleProactiveRefresh(newToken);
                        })
                        .catch(() => {/* 401 interceptor handles full logout */});
                }
            } catch {
                // malformed token — let 401 handle it
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [$user.userToken]);

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
            // _console.specialSuccess("Token refreshed successfully.");
        };
        window.addEventListener(authEvents.unauthorized, handleUnauthorized);
        window.addEventListener(authEvents.specialSuccess, handleRefreshSuccess);
        return () => {
            window.removeEventListener(authEvents.unauthorized, handleUnauthorized);
            window.removeEventListener(authEvents.specialSuccess, handleRefreshSuccess);
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
