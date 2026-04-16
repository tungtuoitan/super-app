/**
 * Task Section Helper
 * All save/discard/change/tab callbacks for TaskDetailSection.
 * Replaces the inline useCallback logic that was previously in the UI file.
 */

import { useCallback } from "react";
import { useTaskDetailSectionStore } from "../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskCustomTabSelector } from "../Selectors/TaskCustomTabSelector";
import { useTaskSectionSelector } from "../Selectors/TaskSectionSelector";
import { useTaskProcessHelper } from "../hooks/useTaskProcess.helper";
import { useTaskChecklistHelper } from "../hooks/useTaskChecklist.helper";
import { useTaskCommentHelper } from "../hooks/useTaskComment.helper";
import { useAuthStore } from "@/store/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { useConfirmationPopoverHelper } from "@/shared/hooks/useConfirmationPopover.helper";
import { taskService } from "../service/task.service";
import { serializeCustomTabs, generateTabId, generateDefaultContent } from "../utils/customTab.utils";
import { isCustomTab, getCustomTabId } from "../utils/taskDetailSection.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { Task } from "../store/useTask.store";
import type { SectionTab } from "../store/useTaskDetailSection.store";

export const useTaskSectionHelper = () => {
    const { activeSection, setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask } = useTaskDetailSelector();
    const { customTabs } = useTaskCustomTabSelector();
    const { isSectionDirty } = useTaskSectionSelector();
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { submitVersionComment, submitComment } = useTaskCommentHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { handleProcessSaveEdit, handleProcessCancelEdit } = useTaskProcessHelper();
    const { handleChecklistSaveEdit, handleChecklistCancelEdit } = useTaskChecklistHelper();

    const {
        descDirty, setDescDirty, savedNoteRef, setDescKey,
        triggerDescFocus, triggerCommentFocus, triggerCustomFocus,
        customTabHandlersRef,
    } = useTaskSectionStore();

    /** Update a field in the active editor tab's data without marking hasUnsavedChanges */
    const updateTabDataSilent = useCallback((field: string, value: unknown) => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === activeTabId ? { ...t, data: { ...(t.data as Task), [field]: value } } : t,
            ),
        );
    }, [activeTabId, setOpenTabs]);

    const handleDescChange = useCallback((value: string) => {
        updateTabDataSilent("note", value);
        setDescDirty(value !== savedNoteRef.current);
    }, [updateTabDataSilent, savedNoteRef, setDescDirty]);

    const handleDescSave = useCallback(async () => {
        if (!selectedTask || selectedTask.id <= 0) return;
        const currentNote = selectedTask.note ?? "";
        const oldNote = savedNoteRef.current;
        await taskService._patchTask($user.userToken, selectedTask.id, { note: currentNote });
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) => t.id === activeTabId ? { ...t, data0: { ...(t.data as Task) } } : t),
        );
        if (oldNote !== currentNote) submitVersionComment("desc", oldNote, currentNote);
        savedNoteRef.current = currentNote;
        setDescDirty(false);
    }, [selectedTask, $user.userToken, activeTabId, setOpenTabs, submitVersionComment, savedNoteRef, setDescDirty]);

    const handleDescDiscard = useCallback(() => {
        if (!selectedTask) return;
        updateTabDataSilent("note", savedNoteRef.current);
        setDescDirty(false);
        setDescKey((p) => p + 1);
    }, [selectedTask, updateTabDataSilent, savedNoteRef, setDescDirty, setDescKey]);

    const handleCustomTabSave = useCallback(async () => {
        const tabId = getCustomTabId(activeSection);
        if (!tabId) return;
        await customTabHandlersRef.current[tabId]?.save();
    }, [activeSection, customTabHandlersRef]);

    const handleCustomTabDiscard = useCallback(() => {
        const tabId = getCustomTabId(activeSection);
        if (!tabId) return;
        customTabHandlersRef.current[tabId]?.discard();
    }, [activeSection, customTabHandlersRef]);

    const handleSectionSave = useCallback(async () => {
        if (activeSection === "process") handleProcessSaveEdit();
        else if (activeSection === "checklist") handleChecklistSaveEdit();
        else if (activeSection === "desc") await handleDescSave();
        else if (isCustomTab(activeSection)) await handleCustomTabSave();
    }, [activeSection, handleProcessSaveEdit, handleChecklistSaveEdit, handleDescSave, handleCustomTabSave]);

    const handleSectionDiscard = useCallback(() => {
        if (activeSection === "process") handleProcessCancelEdit();
        else if (activeSection === "checklist") handleChecklistCancelEdit();
        else if (activeSection === "desc") handleDescDiscard();
        else if (isCustomTab(activeSection)) handleCustomTabDiscard();
    }, [activeSection, handleProcessCancelEdit, handleChecklistCancelEdit, handleDescDiscard, handleCustomTabDiscard]);

    const doSwitchTab = useCallback((key: SectionTab) => {
        setActiveSection(key);
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) => t.id === activeTabId ? { ...t, metadata: { ...t.metadata, activeSection: key } } : t),
        );
        if (key === "desc") triggerDescFocus();
        if (key === "comment") triggerCommentFocus();
        if (isCustomTab(key)) triggerCustomFocus();
    }, [setActiveSection, setOpenTabs, activeTabId, triggerDescFocus, triggerCommentFocus, triggerCustomFocus]);

    const handleTabClick = useCallback((key: SectionTab) => {
        if (key === activeSection) return;
        if (isSectionDirty) handleSectionDiscard();
        doSwitchTab(key);
    }, [activeSection, isSectionDirty, handleSectionDiscard, doSwitchTab]);

    const handleAddCustomTab = useCallback(() => {
        if (!selectedTask) return;
        const tabNumber = customTabs.tabs.length + 1;
        const newTab = {
            id: generateTabId(),
            name: `Tab ${tabNumber}`,
            version: "1",
            content: generateDefaultContent(tabNumber),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const updated = { tabs: [...customTabs.tabs, newTab] };
        updateTabDataSilent("customTabsJson", serializeCustomTabs(updated));
        setTimeout(() => setActiveSection(`custom:${newTab.id}`), 50);
    }, [selectedTask, customTabs, updateTabDataSilent, setActiveSection]);

    const handleDeleteCustomTab = useCallback((tabId: string, anchorEl: HTMLElement | null) => {
        if (!selectedTask) return;
        const tabToDelete = customTabs.tabs.find((t) => t.id === tabId);
        if (!tabToDelete) return;
        showConfirmation({
            title: `Delete "${tabToDelete.name}"?`,
            subtitle: "This tab and its content will be permanently deleted.",
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl,
            onConfirm: async () => {
                const updated = { tabs: customTabs.tabs.filter((t) => t.id !== tabId) };
                updateTabDataSilent("customTabsJson", serializeCustomTabs(updated));
                if (activeSection === `custom:${tabId}`) setActiveSection("desc");
                submitComment(`[Deleted tab "${tabToDelete.name}" v${tabToDelete.version}]`);
            },
        });
    }, [selectedTask, customTabs, updateTabDataSilent, activeSection, setActiveSection, showConfirmation, submitComment]);

    return {
        updateTabDataSilent,
        handleDescChange,
        handleDescSave,
        handleDescDiscard,
        handleSectionSave,
        handleSectionDiscard,
        handleTabClick,
        handleAddCustomTab,
        handleDeleteCustomTab,
    };
};
