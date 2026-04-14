/**
 * Task Checklist Headless
 * Side effects only (useEffect). Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskChecklistStore } from "../store/useTaskChecklist.store";

export function TaskChecklistHeadless() {
    const { isExpanded, setIsExpanded, setIsEditing, setEditErrors, barRef, popupRef } = useTaskChecklistStore();

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
