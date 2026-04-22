import { useEffect } from "react";
import { useTaskProcessStore } from "../store/useTaskProcess.store";

export function useTaskProcessHeadless() {
    const { isExpanded, setIsExpanded, setIsEditing, setEditErrors, barRef, popupRef } = useTaskProcessStore();

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
