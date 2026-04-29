import { useEffect, useRef } from "react";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskDetailFormHelper } from "./useTaskDetailForm.helper";
import { useTaskLinkedKeywordsHelper } from "./useTaskLinkedKeywords.helper";
import { useTaskWorkspaceItemHelper } from "./useTaskWorkspaceItem.helper";
import { useEditorTabHelper } from "@/shell";
import type { BaseTab } from "@/shell";
import {useEditorTabBarStore} from "@/shell";

export function useTaskDetailHeadless() {
    const { selectedTask, currentProject } = useTaskDetailSelector();
    const { loadProjectOptions, loadParentTaskOptions } = useTaskDetailFormHelper();
    const { loadLinkedKeywords } = useTaskLinkedKeywordsHelper();
    const { loadFolderItems } = useTaskWorkspaceItemHelper();
    const { setParentTaskOptions, taskDetailContentRef } = useTaskDetailStore();
    const { setOpenTabs, openTabs } = useEditorTabBarStore();
    const openTabsRef = useRef(openTabs);
    openTabsRef.current = openTabs;
    const { getActiveTab } = useEditorTabHelper();

    const tab = getActiveTab();

    useEffect(() => {
        loadProjectOptions();
    }, []);

    useEffect(() => {
        if (selectedTask?.projectId && selectedTask.projectId > 0) {
            loadParentTaskOptions(selectedTask.projectId, selectedTask.id);
        } else {
            setParentTaskOptions([]);
        }
    }, [selectedTask?.projectId, selectedTask?.id]);

    useEffect(() => {
        if (selectedTask?.id && selectedTask.id > 0) {
            loadLinkedKeywords(selectedTask.id);
        }
    }, [selectedTask?.id]);

    useEffect(() => {
        if (selectedTask?.id && selectedTask.id > 0 && selectedTask.folderWorkspaceItemId && currentProject?.workspaceId) {
            loadFolderItems(selectedTask, currentProject.workspaceId);
        }
    }, [selectedTask?.id, selectedTask?.folderWorkspaceItemId, currentProject?.workspaceId]);

    // Sync hasUnsavedChanges for editor tab.
    // Excludes section fields (note, checklistJson, processJson, customTabsJson)
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
    }, [tab?.id, tab?.data]);

    useEffect(() => {
        if (!tab || !taskDetailContentRef?.current) return;
        const viewState = openTabsRef.current.find((t: BaseTab) => t.id === tab.id)?.viewState;
        if (viewState?.scrollTop !== undefined) {
            taskDetailContentRef.current.scrollTop = viewState.scrollTop;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab?.id, taskDetailContentRef]);
}
