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

    // ── Keyboard shortcuts — register ONCE, read latest values via refs ───────
    // Using refs avoids the remove→re-add cycle on every render that lets the
    // browser sneak in its own Ctrl+Shift+S / Escape handling during the gap.
    const isSectionDirtyRef = useRef(isSectionDirty);
    const handleSectionSaveRef = useRef(handleSectionSave);
    const handleSectionDiscardRef = useRef(handleSectionDiscard);
    isSectionDirtyRef.current = isSectionDirty;
    handleSectionSaveRef.current = handleSectionSave;
    handleSectionDiscardRef.current = handleSectionDiscard;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ctrl+Shift+S or Ctrl+Alt+S — save active section
            const isCtrlShiftS = (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey  && e.key.toLowerCase() === "s";
            const isCtrlAltS   = (e.ctrlKey || e.metaKey) && e.altKey  && !e.shiftKey && e.key.toLowerCase() === "s";
            if (isCtrlShiftS || isCtrlAltS) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (isSectionDirtyRef.current) handleSectionSaveRef.current();
                return;
            }
            // Escape — discard active section
            if (e.key === "Escape" && isSectionDirtyRef.current) {
                e.preventDefault();
                handleSectionDiscardRef.current();
            }
        };
        window.addEventListener("keydown", handler, { capture: true });
        return () => window.removeEventListener("keydown", handler, { capture: true });
    }, []); // intentional empty deps — listener lives for the full mount lifetime

    // ── Auto-discard when user switches editor tabs ───────────────────────────
    useEffect(() => {
        if (isSectionDirty) handleSectionDiscard();
    }, [activeTabId]);

    return null;
}
