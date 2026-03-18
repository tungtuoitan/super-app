/**
 * Task Detail Headless
 * Side-effects only (useEffect). Triggers data loading based on state changes.
 * NO props — reads tab from useEditorTabHelper, contentRef from store.
 * Renders nothing (returns null).
 */

import { useEffect } from "react";
import { useTaskStore } from "@/store/task/useTask.store";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskDetailFormHelper } from "@/hooks/task/useTaskDetailForm.helper";
import { useTaskLinkedKeywordsHelper } from "@/hooks/task/useTaskLinkedKeywords.helper";
import { useTaskWorkspaceItemHelper } from "@/hooks/task/useTaskWorkspaceItem.helper";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
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
    useEffect(() => {
        if (!tab) return;
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === tab.id
                    ? {
                          ...t,
                          hasUnsavedChanges: tab.data && tab.data0 ? JSON.stringify(tab.data) !== JSON.stringify(tab.data0) : false,
                      }
                    : t,
            ),
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
