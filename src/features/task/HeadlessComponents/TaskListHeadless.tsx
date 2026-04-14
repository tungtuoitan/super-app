/**
 * Task List Headless
 * Side-effects only (useEffect). Handles resize observation.
 * Task loading is handled by ProjectDetailHeadless at the parent level.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskStore } from "../store/useTask.store";

export function TaskListHeadless() {
    const { taskContainerRef, setTaskContainerWidth } = useTaskStore();

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
    }, [taskContainerRef, setTaskContainerWidth]);

    return null;
}
