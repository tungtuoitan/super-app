/**
 * ScrollToHighlightItem - Headless component for scrolling to highlighted workspace item
 * Automatically scrolls tree to highlighted item when scrollToItem changes
 */

import { useEffect, useRef } from "react";
import {useKStore} from "../../store/K.store";

export function useScrollToHighlightItem() {
    const { selectedItemIds, _treeRef, scrollToItem, setScrollToItem, currentK, setIsLoadingTree, isLoadingTree } = useKStore();
    const isScrollingRef = useRef(false);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {

        // Prevent multiple simultaneous scroll operations
        if (!scrollToItem || isScrollingRef.current) {
            return;
        }

        if (!selectedItemIds || selectedItemIds.length !== 1) {
            return;
        }

        if(isLoadingTree){
            return;
        }

        // Mark as scrolling to prevent re-entry
        isScrollingRef.current = true;

        // Show loading while scrolling
        setIsLoadingTree(true);

        // Wait for tree to render workspace data (check multiple times with retry)
        let attempts = 0;
        const maxAttempts = 10;

        const tryScroll = () => {
            attempts++;

            const tree = _treeRef.current;

            if (!tree) {
                setScrollToItem(false);
                setIsLoadingTree(false);
                isScrollingRef.current = false;
                return;
            }

            // Find node by workspace_items.id
            const targetNode = tree.visibleNodes.find(
                (n: any) => {
                    const matches = n.data?.data?.id === selectedItemIds[0];
                    if (matches) {
                    }
                    return matches;
                }
            );

            if (targetNode) {

                // Select node first (this will trigger tree's onSelect handler)
                targetNode.select();

                // Then scroll to it smoothly
                tree.scrollTo(targetNode.id, { align: "bottom", behavior: "smooth" });

                // Hide loading after smooth scroll completes (approximate duration)
                setTimeout(() => {
                    setScrollToItem(false);
                    setIsLoadingTree(false);
                    isScrollingRef.current = false;
                }, 500); // Wait for smooth scroll animation
            } else if (attempts < maxAttempts) {
                timeoutIdRef.current = setTimeout(tryScroll, 200); // Retry after 200ms
            } else {
                setScrollToItem(false);
                setIsLoadingTree(false);
                isScrollingRef.current = false;
            }
        };

        // Initial delay to let workspace load
        timeoutIdRef.current = setTimeout(tryScroll, 300);

        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }
            // Reset scrolling flag to allow re-run if needed
            isScrollingRef.current = false;
            // Always clear loading if the operation is cancelled
            setIsLoadingTree(false);
        };
        // Only depend on scrollToItem to prevent re-runs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollToItem]);

    return null;
}