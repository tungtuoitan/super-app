import { useEffect } from "react";
import { useAuthStore } from "@/shared";
import { homeConstants } from "../home.constants";
import { useHomeStore } from "../store/useHome.store";
import { useHomeHelper } from "./useHome.helper";

/** Load public data on mount / user change, refresh hourly and when the day rolls over or the window refocuses. */
export const useHomeDataHeadless = () => {
    const { $user } = useAuthStore();
    const { loadPublic, refreshIfNeeded } = useHomeHelper();

    useEffect(() => {
        if (!$user.userId) return;
        loadPublic();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userId]);

    useEffect(() => {
        const ticker = window.setInterval(() => refreshIfNeeded(homeConstants.refreshIntervalMs), homeConstants.dayCheckIntervalMs);
        const onFocus = () => refreshIfNeeded(homeConstants.staleAfterMs);
        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(ticker);
            window.removeEventListener("focus", onFocus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};

/**
 * Privacy guard: full mode ends by itself (countdown), when the tab/window is hidden, on Escape,
 * and when the home view unmounts. Sensitive data never outlives the screen that shows it.
 */
export const useHomePrivacyHeadless = () => {
    const { privacyMode } = useHomeStore();
    const { lock, tick } = useHomeHelper();

    useEffect(() => {
        if (privacyMode !== "full") return;
        const timer = window.setInterval(tick, homeConstants.countdownTickMs);
        const onVisibility = () => {
            if (document.visibilityState === "hidden") lock();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") lock();
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("keydown", onKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [privacyMode]);

    useEffect(() => () => lock(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []);
};
