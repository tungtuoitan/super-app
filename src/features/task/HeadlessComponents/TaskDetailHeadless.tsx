/**
 * Task Detail Headless
 * Side-effects only (useEffect). Triggers data loading based on state changes.
 * NO props — reads tab from useEditorTabHelper, contentRef from store.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskStore } from "../store/useTask.store";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskDetailFormHelper } from "../hooks/useTaskDetailForm.helper";
import { useTaskLinkedKeywordsHelper } from "../hooks/useTaskLinkedKeywords.helper";
import { useTaskWorkspaceItemHelper } from "../hooks/useTaskWorkspaceItem.helper";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import type { BaseTab } from "@/types/editor/tab.types";

export function TaskDetailHeadless() {
    const { selectedTask, currentProject } = useTaskDetailSelector();
    const { loadProjectOptions, loadParentTaskOptions } = useTaskDetailFormHelper();
    const { loadLinkedKeywords } = useTaskLinkedKeywordsHelper();
    const { loadFolderItems } = useTaskWorkspaceItemHelper();
    const { setParentTaskOptions, taskDetailContentRef } = useTaskStore();
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();

    const tab = getActiveTab();

    // Effect 1: Load project options on mount
    useEffect(() => {
        loadProjectOptions();
    }, [loadProjectOptions]);

    // Effect 2: Load parent task options when project changes
    useEffect(() => {
        if (selectedTask?.projectId && selectedTask.projectId > 0) {
            loadParentTaskOptions(selectedTask.projectId, selectedTask.id);
        } else {
            setParentTaskOptions([]);
        }
    }, [selectedTask?.projectId, selectedTask?.id, loadParentTaskOptions, setParentTaskOptions]);

    // Effect 3: Load linked keywords when task changes
    useEffect(() => {
        if (selectedTask?.id && selectedTask.id > 0) {
            loadLinkedKeywords(selectedTask.id);
        }
    }, [selectedTask?.id, loadLinkedKeywords]);

    // Effect 4: Load folder items when task/folder changes
    useEffect(() => {
        if (selectedTask?.id && selectedTask.id > 0 && selectedTask.folderWorkspaceItemId && currentProject?.workspaceId) {
            loadFolderItems(selectedTask, currentProject.workspaceId);
        }
    }, [selectedTask?.id, selectedTask?.folderWorkspaceItemId, currentProject?.workspaceId, loadFolderItems]);

    // Effect 5: Sync hasUnsavedChanges for editor tab
    // Exclude section fields (note, checklistJson, processJson, customTabsJson)
    // because those are saved independently via section Save buttons.
    useEffect(() => {
        if (!tab) return;
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) => {
                if (t.id !== tab.id) return t;
                const sectionKeys = ["note", "checklistJson", "processJson", "customTabsJson"];
                const stripSections = (obj: any) => {
                    if (!obj) return obj;
                    const copy = { ...obj };
                    for (const k of sectionKeys) delete copy[k];
                    return copy;
                };
                const hasChanges = tab.data && tab.data0
                    ? JSON.stringify(stripSections(tab.data)) !== JSON.stringify(stripSections(tab.data0))
                    : false;
                return { ...t, hasUnsavedChanges: hasChanges };
            }),
        );
    }, [tab?.id, tab?.data, setOpenTabs]);

    // Effect 6: Restore scroll position when tab becomes active (UI-local ref)
    useEffect(() => {
        if (!tab || !taskDetailContentRef?.current) return;
        const viewState = openTabs.find((t: BaseTab) => t.id === tab.id)?.viewState;
        if (viewState?.scrollTop !== undefined) {
            taskDetailContentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab?.id, openTabs, taskDetailContentRef]);

    return null;
}
