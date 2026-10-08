/**
 * Ctrl+J / Cmd+J toggles the bottom panel (VS Code / Linear convention) (#1514).
 */

import { useEffect } from "react";
import { useActivityBarStore } from "../store/ActivityBar.store";

export const usePanelShortcut = () => {
    const { setIsPanelVisible } = useActivityBarStore();

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "j") {
                e.preventDefault();
                setIsPanelVisible((v) => !v);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
};
