/**
 * Keeps a collapsible react-resizable-panels Panel in sync with a visibility flag (#1514).
 * Before this, hiding the bottom panel only unmounted its content and left an empty 30% block.
 *
 * The library restores the saved layout on mount and fires onExpand/onCollapse for it; the returned
 * ref is false until our flag has been applied, so callers can ignore those initial callbacks.
 */

import { useEffect, useRef, type RefObject } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

export const useCollapsiblePanelSync = (ref: RefObject<ImperativePanelHandle>, visible: boolean) => {
    const readyRef = useRef(false);

    useEffect(() => {
        const apply = () => {
            const panel = ref.current;
            if (!panel) return;
            if (visible && panel.isCollapsed()) panel.expand();
            if (!visible && !panel.isCollapsed()) panel.collapse();
        };
        apply();
        // second pass once the group has laid out (first mount)
        const raf = requestAnimationFrame(() => {
            apply();
            readyRef.current = true;
        });
        return () => cancelAnimationFrame(raf);
    }, [visible]);

    return readyRef;
};
