/**
 * Multi-Project Task List Headless
 * Side-effects only (useEffect). Handles resize observation.
 * Task loading is handled by useMultiProjectDetailHeadless at the parent level.
 */

import { useEffect } from "react";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";

export function useMultiProjectTaskListHeadless() {
    const { taskContainerRef, setTaskContainerWidth } = useMpTaskStore();

    // Update container width on resize
    useEffect(() => {
        if (!taskContainerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setTaskContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(taskContainerRef.current);
        return () => resizeObserver.disconnect();
    }, [taskContainerRef]);
}
