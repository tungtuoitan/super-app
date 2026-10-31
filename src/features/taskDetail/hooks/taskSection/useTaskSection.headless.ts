import { useEffect, useRef } from "react";
import { SectionTab, useTaskDetailSectionStore } from "../../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import { useGlobalShortcut } from "@/shared";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskSectionSelector } from "../../Selectors/TaskSectionSelector";
import { useTaskSectionHelper } from "./useTaskSection.helper";
import { useEditorTabBarHelper } from "@/shell";

export function useTaskSectionHeadless() {
    const { setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask } = useTaskDetailSelector();
    const { getActiveTab, activeTabId } = useEditorTabBarHelper();
    const { isSectionDirty } = useTaskSectionSelector();
    const { handleSectionSave, handleSectionDiscard, handleSectionDiscardByUser } = useTaskSectionHelper();
    const { savedNoteRef, setDescDirty, setDescKey, saveRequestedRef, triggerSavedToast, discardRequestedRef, triggerDiscardedToast } = useTaskSectionStore();

    const lastTaskIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!selectedTask || selectedTask.id === lastTaskIdRef.current) return;
        lastTaskIdRef.current = selectedTask.id;
        const activeTab = getActiveTab();
        const savedSection = activeTab?.metadata?.activeSection as SectionTab | undefined;
        setActiveSection(savedSection ?? (selectedTask.id <= 0 ? "desc" : "process"));
    }, [selectedTask?.id]);

    useEffect(() => {
        if (!selectedTask) return;
        setDescKey((p) => p + 1);
        setDescDirty(false);
        savedNoteRef.current = selectedTask.description ?? "";
    }, [selectedTask?.id]);

    // A save or a user Discard that turns the section clean plays its confirmation; silent discards and failed saves do not
    const wasDirtyRef = useRef(false);
    useEffect(() => {
        if (wasDirtyRef.current && !isSectionDirty) {
            if (saveRequestedRef.current) triggerSavedToast();
            else if (discardRequestedRef.current) triggerDiscardedToast();
        }
        saveRequestedRef.current = false;
        discardRequestedRef.current = false;
        wasDirtyRef.current = isSectionDirty;
    }, [isSectionDirty]);

    const isSectionDirtyRef = useRef(isSectionDirty);
    const handleSectionSaveRef = useRef(handleSectionSave);
    const handleSectionDiscardRef = useRef(handleSectionDiscardByUser);
    isSectionDirtyRef.current = isSectionDirty;
    handleSectionSaveRef.current = handleSectionSave;
    handleSectionDiscardRef.current = handleSectionDiscardByUser;

    // Ctrl+S saves the dirty section when it is the only thing with unsaved changes
    // (the task fields are clean, so the toolbar Save is not lit). Both dirty → toolbar wins as before.
    const isTaskDirty = getActiveTab()?.hasUnsavedChanges ?? false;
    useGlobalShortcut("ctrl+s",       { id: "task-section-save-only", priority: 100, enabled: isSectionDirty && !isTaskDirty }, () => { handleSectionSaveRef.current(); });
    useGlobalShortcut("ctrl+shift+s", { id: "task-section-save",     priority: 100, enabled: isSectionDirty }, () => { handleSectionSaveRef.current(); });
    useGlobalShortcut("ctrl+alt+s",   { id: "task-section-save-alt", priority: 100, enabled: isSectionDirty }, () => { handleSectionSaveRef.current(); });
    useGlobalShortcut("escape",        { id: "task-section-discard",  priority:  50, enabled: isSectionDirty }, () => { handleSectionDiscardRef.current(); });

    useEffect(() => {
        if (isSectionDirty) handleSectionDiscard();
    }, [activeTabId]);
}
