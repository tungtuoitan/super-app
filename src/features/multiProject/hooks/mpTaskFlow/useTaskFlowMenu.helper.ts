/**
 * Task Flow Menu Helper — Pattern B
 * Reads typed contextData; calls useMultiProjectTaskFlowNodeHelper directly.
 * No callbacks stored in contextData.
 */

import { useMenuContext, useMenuContextHelper } from "@/shared";
import type { TaskFlowMenuData } from "@/shared";

export const useTaskFlowMenuHelper = () => {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    const data = contextData as TaskFlowMenuData | null;
    const onAddTask = data?.onAddTask;

    const addTask = () => {
        setIsMenuContextOpen(false);
        onAddTask?.();
    };

    return { addTask };
};
