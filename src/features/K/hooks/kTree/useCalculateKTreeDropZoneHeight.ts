/**
 * CalculateWorkspaceTreeDropZoneHeight - Headless component for drop zone height calculation
 * Uses treeRef to get accurate visible node count and calculate remaining space
 */

import { useEffect } from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import type { TreeApi } from "react-arborist";
import {kconstants} from "../../utils/K.Constants";
import {KTreeNode} from "./Ktree.miniHelper";
 
interface CalculateWorkspaceTreeDropZoneHeightProps { 
    treeData: KTreeNode[];
    containerHeight: number;
    treeRef: React.RefObject<TreeApi<KTreeNode>>;
    setDropZoneHeight: (height: number) => void;
}

export function useCalculateKTreeDropZoneHeight({
    treeData,
    containerHeight,
    treeRef,
    setDropZoneHeight,
}: CalculateWorkspaceTreeDropZoneHeightProps) {
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

                if (entityId !== workspaceConstants.root.entityId && entityId !== workspaceConstants.dropZone.entityId) {
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



