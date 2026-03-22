/**
 * Task Process Headless
 * Side effects only (useEffect). Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskProcessStore } from "@/store/task/useTaskProcess.store";

export function TaskProcessHeadless() {
    const { isExpanded, setIsExpanded, setIsEditing, setEditErrors, barRef, popupRef } = useTaskProcessStore();

    // Close popup on outside click
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

    return null;
}
