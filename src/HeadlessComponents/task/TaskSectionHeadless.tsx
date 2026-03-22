/**
 * Task Section Headless
 * Side-effects for the task section: task-change resets, keyboard shortcuts,
 * auto-discard on editor tab switch.
 * No UI — returns null.
 */

import { useEffect, useRef } from "react";
import { useTaskDetailSectionStore } from "@/store/task/useTaskDetailSection.store";
import { useTaskSectionStore } from "@/store/task/useTaskSection.store";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskSectionSelector } from "@/Selectors/task/TaskSectionSelector";
import { useTaskSectionHelper } from "@/hooks/task/useTaskSection.helper";
import { useEditorTabsStore } from "@/store/index";

export function TaskSectionHeadless() {
    const { setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask } = useTaskDetailSelector();
    const { activeTabId } = useEditorTabsStore();
    const { isSectionDirty } = useTaskSectionSelector();
    const { handleSectionSave, handleSectionDiscard } = useTaskSectionHelper();
    const { savedNoteRef, setDescDirty, setDescKey } = useTaskSectionStore();

    const lastTaskIdRef = useRef<number | null>(null);

    // ── Auto-set default section when task changes ────────────────────────────
    useEffect(() => {
        if (!selectedTask || selectedTask.id === lastTaskIdRef.current) return;
        lastTaskIdRef.current = selectedTask.id;
        setActiveSection(selectedTask.id <= 0 ? "desc" : "process");
    }, [selectedTask?.id]);

    // ── Reset desc state when task changes ────────────────────────────────────
    useEffect(() => {
        if (!selectedTask) return;
        setDescKey((p) => p + 1);
        setDescDirty(false);
        savedNoteRef.current = selectedTask.note ?? "";
    }, [selectedTask?.id]);

    // ── Ctrl+Shift+S: save active section ────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (isSectionDirty) handleSectionSave();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isSectionDirty, handleSectionSave]);

    // ── Auto-discard when user switches editor tabs ───────────────────────────
    useEffect(() => {
        if (isSectionDirty) handleSectionDiscard();
    }, [activeTabId]);

    return null;
}
