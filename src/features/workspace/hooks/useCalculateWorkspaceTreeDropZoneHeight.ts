import { useEffect } from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { useWorkspaceStore } from "../store/workspace.store";

export function useCalculateWorkspaceTreeDropZoneHeight() {
    const { _treeRef, containerHeight, setDropZoneHeight, currentWorkspace } = useWorkspaceStore();

    useEffect(() => {
        const calculateDropZoneHeight = () => {
            const ROW_HEIGHT = 32;
            const tree = _treeRef.current;

            if (!tree) {
                setDropZoneHeight(0);
                return;
            }

            let visibleCount = 0;
            for (let i = 0; i < tree.visibleNodes.length; i++) {
                const node = tree.visibleNodes[i];
                const entityId = (node.data.data as any)?.entityId;
                if (entityId !== workspaceConstants.root.entityId && entityId !== workspaceConstants.dropZone.entityId) {
                    visibleCount++;
                }
            }

            const actualTreeHeight = (visibleCount + 1) * ROW_HEIGHT;
            setDropZoneHeight(Math.max(containerHeight - actualTreeHeight, 0));
        };

        calculateDropZoneHeight();
    }, [currentWorkspace, containerHeight, _treeRef]);
}
