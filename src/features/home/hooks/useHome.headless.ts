import { useEffect } from "react";
import QRCode from "qrcode";
import { useAuthStore } from "@/shared";
import { homeConstants } from "../home.constants";
import { getHomeState, useHomeStore } from "../store/useHome.store";
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

/** Keys 1–6 switch tabs (not while typing in a field). */
export const useHomeViewKeysHeadless = () => {
    const { showView } = useHomeHelper();

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const el = document.activeElement as HTMLElement | null;
            if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return;
            const view = homeConstants.views["123456".indexOf(e.key)];
            if (view) showView(view.key);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};

/**
 * The v5 layout is drawn for ≥ 1280×820: when the editor area is smaller, zoom the page out so it
 * still fits without scrolling (same rule as the design). Root element: #home-root.
 */
export const useHomeFitHeadless = () => {
    useEffect(() => {
        const root = document.getElementById(homeConstants.rootId);
        const box = root?.parentElement;
        if (!root || !box) return;
        const fit = () => {
            const { clientWidth: w, clientHeight: h } = box;
            const z = Math.min(1, w / homeConstants.fitWidth, h / homeConstants.fitHeight);
            root.style.setProperty("zoom", z < 1 ? String(z) : "");
            root.style.width = z < 1 ? `${w / z}px` : "100%";
            root.style.height = z < 1 ? `${h / z}px` : "100%";
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(box);
        return () => ro.disconnect();
    }, []);
};

/** TOTP dialog: draw the QR of the otpauth link while setting up; Escape closes the dialog. */
export const useHomeTotpHeadless = () => {
    const { totpUri, totpMode } = useHomeStore();
    const { closeTotp } = useHomeHelper();

    useEffect(() => {
        if (!totpUri) return;
        let cancelled = false;
        QRCode.toDataURL(totpUri, { margin: 1, width: 400, color: { dark: "#111111", light: "#f2f2f2" } })
            .then((url) => { if (!cancelled) getHomeState().setTotpQr(url); })
            .catch(() => { if (!cancelled) getHomeState().setTotpError("Không vẽ được mã QR — nhập khoá bằng tay"); });
        return () => { cancelled = true; };
    }, [totpUri]);

    useEffect(() => {
        if (totpMode === "closed") return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeTotp();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totpMode]);
};
