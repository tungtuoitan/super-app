/**
 * CalculateMovingTreeContainerHeight - Headless component for MovingTree
 * Tracks container height changes and updates store
 */

import { useEffect } from "react";
import { useKMovingTreeStore } from "../store/KMovingTree.store";

export function CalculateKMovingTreeContainerHeight() { 
    const { treeContainerRef, setContainerHeight,containerHeight } = useKMovingTreeStore();
    
    // Track container height to make Tree component responsive
    useEffect(() => {
        const updateHeight = () => {
            if (treeContainerRef.current) {
                const height = treeContainerRef.current.clientHeight;
                // Ensure height is always a valid number
                if (height && typeof height === "number" && height > 0) {
                    setContainerHeight(height);
                }
            }
        };

        // Initial height with delay to ensure DOM is ready
        setTimeout(updateHeight, 100);

        // Observe container size changes
        const resizeObserver = new ResizeObserver(updateHeight);
        if (treeContainerRef.current) {
            resizeObserver.observe(treeContainerRef.current);
        }

        // Also listen to window resize
        window.addEventListener("resize", updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, [treeContainerRef]);

    return null;
}

 