import { useEffect } from "react";
import { useTaskProcessStore } from "../store/useTaskProcess.store";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { useTaskProcessHelper } from "../hooks/useTaskProcess.helper";

export function useTaskProcessHeadless() {
    const { isExpanded, setIsExpanded, setIsEditing, setEditErrors, barRef, popupRef } = useTaskProcessStore();
    const { builtinSectionHandlersRef } = useTaskSectionStore();
    const { handleProcessSaveEdit, handleProcessCancelEdit } = useTaskProcessHelper();

    useEffect(() => {
        builtinSectionHandlersRef.current.process = {
            save: async () => { handleProcessSaveEdit(); },
            discard: handleProcessCancelEdit,
        };
        return () => { delete builtinSectionHandlersRef.current.process; };
    }, [handleProcessSaveEdit, handleProcessCancelEdit, builtinSectionHandlersRef]);

    useEffect(() => {
        if (!isExpanded) return;
        const handler = (e: MouseEvent) => {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                barRef.current && !barRef.current.contains(e.target as Node)
            ) {
                setIsExpanded(false);
                setIsEditing(false);
                setEditErrors([]);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isExpanded, barRef, popupRef, setIsExpanded, setIsEditing, setEditErrors]);
}
