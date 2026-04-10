/**
 * Task Section Headless
 * Side-effects for the task section: task-change resets, keyboard shortcuts,
 * auto-discard on editor tab switch.
 * No UI — returns null.
 */

import { useEffect, useRef } from "react";
import { SectionTab, useTaskDetailSectionStore } from "@/store/task/useTaskDetailSection.store";
import { useTaskSectionStore } from "@/store/task/useTaskSection.store";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskSectionSelector } from "@/Selectors/task/TaskSectionSelector";
import { useTaskSectionHelper } from "@/hooks/task/useTaskSection.helper";
import { useEditorTabsStore } from "@/store/index";

export function TaskSectionHeadless() {
    const { setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask } = useTaskDetailSelector();
    const { openTabs, activeTabId } = useEditorTabsStore();
    const { isSectionDirty } = useTaskSectionSelector();
    const { handleSectionSave, handleSectionDiscard } = useTaskSectionHelper();
    const { savedNoteRef, setDescDirty, setDescKey } = useTaskSectionStore();

    const lastTaskIdRef = useRef<number | null>(null);

    // ── Auto-set default section when task changes ────────────────────────────
    useEffect(() => {
        if (!selectedTask || selectedTask.id === lastTaskIdRef.current) return;
        lastTaskIdRef.current = selectedTask.id;
        const activeTab = openTabs.find((t) => t.id === activeTabId);
        const savedSection = activeTab?.metadata?.activeSection as SectionTab | undefined;
        setActiveSection(savedSection ?? (selectedTask.id <= 0 ? "desc" : "process"));
    }, [selectedTask?.id]);

    // ── Reset desc state when task changes ────────────────────────────────────
    useEffect(() => {
        if (!selectedTask) return;
        setDescKey((p) => p + 1);
        setDescDirty(false);
        savedNoteRef.current = selectedTask.note ?? "";
    }, [selectedTask?.id]);

    // ── Keyboard shortcuts — register ONCE, read latest values via refs ───────
    const isSectionDirtyRef = useRef(isSectionDirty);
    const handleSectionSaveRef = useRef(handleSectionSave);
    const handleSectionDiscardRef = useRef(handleSectionDiscard);
    isSectionDirtyRef.current = isSectionDirty;
    handleSectionSaveRef.current = handleSectionSave;
    handleSectionDiscardRef.current = handleSectionDiscard;

    useGlobalShortcut("ctrl+shift+s", { id: "task-section-save", priority: 100 }, () => {
        if (isSectionDirtyRef.current) handleSectionSaveRef.current();
        return true;
    });

    useGlobalShortcut("ctrl+alt+s", { id: "task-section-save-alt", priority: 100 }, () => {
        if (isSectionDirtyRef.current) handleSectionSaveRef.current();
        return true;
    });

    useGlobalShortcut("escape", { id: "task-section-discard", priority: 50 }, () => {
        if (isSectionDirtyRef.current) {
            handleSectionDiscardRef.current();
            return true;
        }
        return false; // not dirty → let other handlers handle Escape
    });

    // ── Auto-discard when user switches editor tabs ───────────────────────────
    useEffect(() => {
        if (isSectionDirty) handleSectionDiscard();
    }, [activeTabId]);

    return null;
}
