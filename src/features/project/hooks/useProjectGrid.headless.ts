/**
 * ProjectGrid Headless
 * Side-effects only (useEffect). No UI.
 * Handles container resize observation (sidebar-local side-effect).
 *
 * Data loading and MultiProject tab initialization live in projectModule.useGlobalInit
 * so they run regardless of which sidebar module is currently active.
 */

import { useEffect } from "react";
import { useProjectStore } from "../store/useProject.store";

export const useProjectGridHeadless = () => {
    const { containerRef, setContainerWidth } = useProjectStore();

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);
};
