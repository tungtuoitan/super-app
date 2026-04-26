/**
 * Task Section Helper
 * All save/discard/change/tab callbacks for TaskDetailSection.
 * Replaces the inline useCallback logic that was previously in the UI file.
 */


import { useTaskDetailSectionStore } from "../../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskCustomTabSelector } from "../../Selectors/TaskCustomTabSelector";
import { useTaskSectionSelector } from "../../Selectors/TaskSectionSelector";
import { useTaskCommentHelper } from "../taskComment/useTaskComment.helper";
import { useAuthStore } from "@/shell/store/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { useConfirmationPopoverHelper } from "@/shared/hooks/useConfirmationPopover.helper";
import { taskService } from "../../service/task.service";
import { serializeCustomTabs, generateTabId, generateDefaultContent } from "../../utils/customTab.utils";
import { isCustomTab, getCustomTabId } from "../../utils/taskDetailSection.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { Task } from "../../store/useTask.store";
import type { SectionTab } from "../../store/useTaskDetailSection.store";

export const useTaskSectionHelper = () => {
    const { activeSection, setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask } = useTaskDetailSelector();
    const { customTabs } = useTaskCustomTabSelector();
    const { isSectionDirty } = useTaskSectionSelector();
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { submitVersionComment, submitComment } = useTaskCommentHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();

    const {
        descDirty, setDescDirty, savedNoteRef, setDescKey,
        triggerDescFocus, triggerCommentFocus, triggerCommentLoad, triggerCustomFocus,
        customTabHandlersRef, builtinSectionHandlersRef,
    } = useTaskSectionStore();

    /** Update a field in the active editor tab's data without marking hasUnsavedChanges */
    const updateTabDataSilent = (field: string, value: unknown) => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === activeTabId ? { ...t, data: { ...(t.data as Task), [field]: value } } : t,
            ),
        );
    }

    const handleDescChange = (value: string) => {
        updateTabDataSilent("note", value);
        setDescDirty(value !== savedNoteRef.current);
    }

    const handleDescSave = async () => {
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
    }
    
    const handleDescDiscard = () => {
        if (!selectedTask) return;
        updateTabDataSilent("note", savedNoteRef.current);
        setDescDirty(false);
        setDescKey((p) => p + 1);
    }
    const handleCustomTabSave = async () => {
        const tabId = getCustomTabId(activeSection);
        if (!tabId) return;
        await customTabHandlersRef.current[tabId]?.save();
    }
    const handleCustomTabDiscard = () => {
        const tabId = getCustomTabId(activeSection);
        if (!tabId) return;
        customTabHandlersRef.current[tabId]?.discard();
    }
    const handleSectionSave = async () => {
        if (activeSection === "process") await builtinSectionHandlersRef.current.process?.save();
        else if (activeSection === "checklist") await builtinSectionHandlersRef.current.checklist?.save();
        else if (activeSection === "desc") await handleDescSave();
        else if (isCustomTab(activeSection)) await handleCustomTabSave();
    }
    const handleSectionDiscard = () => {
        if (activeSection === "process") builtinSectionHandlersRef.current.process?.discard();
        else if (activeSection === "checklist") builtinSectionHandlersRef.current.checklist?.discard();
        else if (activeSection === "desc") handleDescDiscard();
        else if (isCustomTab(activeSection)) handleCustomTabDiscard();
    }
    const doSwitchTab = (key: SectionTab) => {
        setActiveSection(key);
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) => t.id === activeTabId ? { ...t, metadata: { ...t.metadata, activeSection: key } } : t),
        );
        if (key === "desc") triggerDescFocus();
        if (key === "comment") { triggerCommentFocus(); triggerCommentLoad(); }
        if (isCustomTab(key)) triggerCustomFocus();
    }
    const handleTabClick = (key: SectionTab) => {
        if (key === activeSection) return;
        if (isSectionDirty) handleSectionDiscard();
        doSwitchTab(key);
    }
    const handleAddCustomTab = () => {
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
    }
    const handleDeleteCustomTab = (tabId: string, anchorEl: HTMLElement | null) => {
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
    }
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
