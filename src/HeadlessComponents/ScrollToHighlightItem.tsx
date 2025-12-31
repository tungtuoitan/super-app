/**
 * ScrollToHighlightItem - Headless component for scrolling to highlighted workspace item
 * Automatically scrolls tree to highlighted item when scrollToItem changes
 */

import { useEffect, useRef } from "react";
import {useWorkspaceStore} from "../store";

export function ScrollToHighlightItem() {
    const { selectedItemIds, _treeRef, scrollToItem, setScrollToItem, currentWorkspace, setIsLoadingTree, isLoadingTree } = useWorkspaceStore();
    const isScrollingRef = useRef(false);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // console.log("🔍 ScrollToHighlightItem: useEffect triggered, scrollToItem =", scrollToItem);

        // Prevent multiple simultaneous scroll operations
        if (!scrollToItem || isScrollingRef.current) {
            // console.log("🔍 ScrollToHighlightItem: Skipping - scrollToItem:", scrollToItem, "isScrolling:", isScrollingRef.current);
            return;
        }

        if (!selectedItemIds || selectedItemIds.length !== 1) {
            // console.log("🔍 ScrollToHighlightItem: Invalid selectedItemIds, length =", selectedItemIds?.length);
            return;
        }

        if(isLoadingTree){
            // console.log("🔍 ScrollToHighlightItem: Tree is already loading, aborting scroll")
            return;
        }



        // console.log("🔍 ScrollToHighlightItem: Starting scroll process for item", selectedItemIds[0]);

        // Mark as scrolling to prevent re-entry
        isScrollingRef.current = true;

        // Show loading while scrolling
        setIsLoadingTree(true);

        // Wait for tree to render workspace data (check multiple times with retry)
        let attempts = 0;
        const maxAttempts = 10;

        const tryScroll = () => {
            attempts++;
            // console.log(`🔍 ScrollToHighlightItem: tryScroll attempt ${attempts}/${maxAttempts}`);

            const tree = _treeRef.current;

            if (!tree) {
                console.log("🔍 ScrollToHighlightItem: Tree not found");
                setScrollToItem(false);
                setIsLoadingTree(false);
                isScrollingRef.current = false;
                return;
            }

            // console.log(`🔍 ScrollToHighlightItem: Tree found, visible nodes:`, tree.visibleNodes.length);
            // console.log(`🔍 ScrollToHighlightItem: Looking for workspace_items.id =`, selectedItemIds[0]);

            // Find node by workspace_items.id
            const targetNode = tree.visibleNodes.find(
                (n: any) => {
                    const matches = n.data?.data?.id === selectedItemIds[0];
                    if (matches) {
                        // console.log(`🔍 ScrollToHighlightItem: Match found! Node id:`, n.data?.data?.id);
                    }
                    return matches;
                }
            );

            // console.log(`🔍 ScrollToHighlightItem: Search result - targetNode found:`, !!targetNode);

            if (targetNode) {
                // console.log("🔍 ScrollToHighlightItem: ✅ Found node, selecting and scrolling to", targetNode.id);

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
                // console.log("🔍 ScrollToHighlightItem: Node not found, retrying...");
                timeoutIdRef.current = setTimeout(tryScroll, 200); // Retry after 200ms
            } else {
                // console.log("🔍 ScrollToHighlightItem: Max attempts reached, node not found");
                setScrollToItem(false);
                setIsLoadingTree(false);
                isScrollingRef.current = false;
            }
        };

        // Initial delay to let workspace load
        // console.log("🔍 ScrollToHighlightItem: Setting initial timeout (300ms)");
        timeoutIdRef.current = setTimeout(tryScroll, 300);

        return () => {
            // console.log("🔍 ScrollToHighlightItem: Cleanup - clearing timeout, scrollToItem was:", scrollToItem);
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }
            // Reset scrolling flag to allow re-run if needed
            isScrollingRef.current = false;
        };
        // Only depend on scrollToItem to prevent re-runs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollToItem]);

    return null;
}