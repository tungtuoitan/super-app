/**
 * Task Flow Menu Helper — Pattern B
 * Reads typed contextData; calls useMultiProjectTaskFlowNodeHelper directly.
 * No callbacks stored in contextData.
 */

import { useOrchestratorContextMenuStore } from "@/shared";
import type { TaskFlowMenuData } from "@/shared";
import { useMultiProjectTaskFlowNodeHelper } from "./useMultiProjectTaskFlowNode.helper";

export const useTaskFlowMenuHelper = () => {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { handleAddTaskAtPosition } = useMultiProjectTaskFlowNodeHelper();

    const data = contextData as TaskFlowMenuData | null;
    const flowPosition = data?.flowPosition ?? { x: 0, y: 0 };

    const addTask = () => {
        setIsContextMenuOpen(false);
        handleAddTaskAtPosition(flowPosition.x, flowPosition.y);
    };

    return { addTask };
};
