import { useEffect, useRef } from "react";
import { SectionTab, useTaskDetailSectionStore } from "../../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskSectionSelector } from "../../Selectors/TaskSectionSelector";
import { useTaskSectionHelper } from "./useTaskSection.helper";
import {useEditorTabBarStore} from "@/shell";

export function useTaskSectionHeadless() {
    const { setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask } = useTaskDetailSelector();
    const { openTabs, activeTabId } = useEditorTabBarStore();
    const { isSectionDirty } = useTaskSectionSelector();
    const { handleSectionSave, handleSectionDiscard } = useTaskSectionHelper();
    const { savedNoteRef, setDescDirty, setDescKey } = useTaskSectionStore();

    const lastTaskIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!selectedTask || selectedTask.id === lastTaskIdRef.current) return;
        lastTaskIdRef.current = selectedTask.id;
        const activeTab = openTabs.find((t) => t.id === activeTabId);
        const savedSection = activeTab?.metadata?.activeSection as SectionTab | undefined;
        setActiveSection(savedSection ?? (selectedTask.id <= 0 ? "desc" : "process"));
    }, [selectedTask?.id]);

    useEffect(() => {
        if (!selectedTask) return;
        setDescKey((p) => p + 1);
        setDescDirty(false);
        savedNoteRef.current = selectedTask.note ?? "";
    }, [selectedTask?.id]);

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
        return false;
    });

    useEffect(() => {
        if (isSectionDirty) handleSectionDiscard();
    }, [activeTabId]);
}
