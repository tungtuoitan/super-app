/**
 * Single-line tab bar (#1514): keep the active tab scrolled into view.
 */

import { useEffect, type RefObject } from "react";

export const useScrollActiveTabIntoView = (containerRef: RefObject<HTMLElement>, activeTabId: string | null) => {
    useEffect(() => {
        if (!activeTabId) return;
        const el = containerRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`);
        el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [activeTabId]);
};
