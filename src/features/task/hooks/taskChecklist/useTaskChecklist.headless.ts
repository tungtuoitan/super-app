import { useEffect } from "react";
import { useTaskChecklistStore } from "../../store/useTaskChecklist.store";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import {useTaskChecklistHelper} from "./useTaskChecklist.helper";

export function useTaskChecklistHeadless() {
    const { isExpanded, setIsExpanded, setIsEditing, setEditErrors, barRef, popupRef } = useTaskChecklistStore();
    const { builtinSectionHandlersRef } = useTaskSectionStore();
    const { handleChecklistSaveEdit, handleChecklistCancelEdit } = useTaskChecklistHelper();

    useEffect(() => {
        builtinSectionHandlersRef.current.checklist = {
            save: async () => { handleChecklistSaveEdit(); },
            discard: handleChecklistCancelEdit,
        };
        return () => { delete builtinSectionHandlersRef.current.checklist; };
    }, [builtinSectionHandlersRef]);

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
    }, [isExpanded, barRef, popupRef]);
}
