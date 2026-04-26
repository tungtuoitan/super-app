import { useEffect } from "react";
import { usePTaskStore } from "../../store/usePTask.store";

export function useTaskListHeadless() {
    const { taskContainerRef, setTaskContainerWidth } = usePTaskStore();

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
