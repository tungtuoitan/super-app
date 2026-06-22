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

import { useEffect, useRef } from "react";
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

    // Refs updated every render so closures always read the latest values
    // without needing to re-run configureApiClient on every token change.
    const tokenRef = useRef($user.userToken);
    tokenRef.current = $user.userToken;
    const logoutRef = useRef(logout);
    logoutRef.current = logout;

    // Configure apiFetch singleton once — closures read from refs so they
    // always return the current token/logout even before effects re-run.
    useEffect(() => {
        configureApiClient({
            getToken: () => tokenRef.current,
            setToken: (token) => set$User((prev) => ({ ...prev, userToken: token })),
            onAuthFailed: () => logoutRef.current(),
        });
    }, []);

    // On mount: try to restore session from HttpOnly cookie + cached profile.
    // Skip on /auth/callback — loginWithGoogleCode handles auth there and
    // running both concurrently causes a race that clears the fresh token.
    // hasInitializedRef prevents React Strict Mode's double-invoke from firing
    // two concurrent refresh calls (rotating tokens would invalidate the second).
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (window.location.pathname.includes("/auth/callback")) return;
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;
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
            if (!token) {
                debugLog.log("auth", "visibility-refresh-skip", { reason: "no-token", device: getDeviceFingerprint() });
                debugLog.flush();
                return;
            }
            // If less than 5 minutes left, refresh now instead of waiting for 401
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                const expiryMs: number = payload.exp * 1000;
                const msLeft = expiryMs - Date.now();
                debugLog.log("auth", "visibility-refresh-check", {
                    msLeft,
                    expiryIso: new Date(expiryMs).toISOString(),
                    willRefresh: msLeft < 5 * 60_000,
                    device: getDeviceFingerprint(),
                });
                if (msLeft < 5 * 60_000) {
                    acquireRefreshToken()
                        .then((newToken) => {
                            set$User((prev) => ({ ...prev, userToken: newToken }));
                            scheduleProactiveRefresh(newToken);
                            debugLog.log("auth", "visibility-refresh-ok", { device: getDeviceFingerprint() });
                            debugLog.flush();
                        })
                        .catch((err) => {
                            debugLog.log("auth", "visibility-refresh-failed", {
                                error: String(err),
                                device: getDeviceFingerprint(),
                            });
                            debugLog.flush();
                            /* 401 interceptor handles full logout */
                        });
                } else {
                    debugLog.flush();
                }
            } catch (err) {
                debugLog.log("auth", "visibility-refresh-bad-token", {
                    error: String(err),
                    device: getDeviceFingerprint(),
                });
                debugLog.flush();
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
