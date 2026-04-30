/**
 * CalculateMovingTreeDropZoneHeight - Headless component for drop zone height calculation
 * Uses treeRef to get accurate visible node count and calculate remaining space
 */

import { useEffect } from "react";
import type { TreeApi } from "react-arborist";
import { TreeFolder } from "./tree.miniHelper";
import { constants } from "@/shared";

interface CalculateMovingTreeDropZoneHeightProps {
    treeData: TreeFolder[];
    containerHeight: number;
    treeRef: React.RefObject<TreeApi<TreeFolder>>;
    setDropZoneHeight: (height: number) => void;
}

export function CalculateMovingTreeDropZoneHeight({ treeData, containerHeight, treeRef, setDropZoneHeight }: CalculateMovingTreeDropZoneHeightProps) {
    useEffect(() => {
        const calculateDropZoneHeight = () => {
            const ROW_HEIGHT = 32;
            const tree = treeRef.current;
 
            if (!tree) {
                setDropZoneHeight(0);
                return;
            }

            // Count visible nodes (excluding workspace root and drop zone)
            let visibleCount = 0;
            for (let i = 0; i < tree.visibleNodes.length; i++) {
                const node = tree.visibleNodes[i];
                const entityId = (node.data.data as any)?.entityId;

                if (entityId !== constants.workspace.root.entityId && entityId !== constants.workspace.dropZone.entityId) {
                    visibleCount++;
                }
            }

            const actualTreeHeight = (visibleCount + 1) * ROW_HEIGHT;
            const remaining = containerHeight - actualTreeHeight;

            setDropZoneHeight(Math.max(remaining, 0));
        };

        // Recalculate when tree data changes or container resizes
        calculateDropZoneHeight();
    }, [treeData, containerHeight, treeRef]);

    return null;
}
