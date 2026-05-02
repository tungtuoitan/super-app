import { shellConstants } from "@/shell";
import { useProjectDetailHelper } from "./useProjectDetail.helper";
import { useTaskDetailHelper, useTaskFolderHelper } from "@/features/taskDetail";
import { useDebugLog } from "@/shared";
import type { BaseTab } from "@/shell";
import type { Task } from "@/features/taskDetail";
import { SaveActions, useEditorTabBarHelper } from "@/shell";
import { usePTaskStore } from "../store/usePTask.store";
import { useProjectWorkspaceResolver } from "./useProjectWorkspaceResolver";

export function useProjectSaveActions(): SaveActions {
    const { upsertProject } = useProjectDetailHelper();
    const { upsertTask } = useTaskDetailHelper();
    const { createTaskFolder } = useTaskFolderHelper();
    const { setTasks } = usePTaskStore();
    const { resolveWorkspaceId } = useProjectWorkspaceResolver();
    const { patchTab } = useEditorTabBarHelper();
    const debugLog = useDebugLog();
    const handles = (tabType: string) =>
        tabType === shellConstants.vscode.tab.tabTypes.project ||
        tabType === shellConstants.vscode.tab.tabTypes.task;

    const onSave = async (tab: BaseTab) => {
        if (tab.type === shellConstants.vscode.tab.tabTypes.project) {
            await upsertProject(tab.id);
        } else if (tab.type === shellConstants.vscode.tab.tabTypes.task) {
            const isNewTask = (tab.data as Task).id <= 0;
            debugLog.log("task-upsert", "toolbar-save-task", {
                taskId: (tab.data as Task).id,
                isNewTask,
                folderWorkspaceItemId: (tab.data as Task).folderWorkspaceItemId,
                source: "useProjectSaveActions",
            });
            // TODO: tại sao lại upsert task ở đây nhỉ?
            const savedTask = await upsertTask(tab.id);
            if (isNewTask && savedTask) {
                const workspaceId = await resolveWorkspaceId(savedTask.projectId);
                await createTaskFolder(savedTask, workspaceId, (taskId, folderId) => {
                    // Update pTask store
                    setTasks((prev) => prev.map((t) =>
                        t.id === taskId ? { ...t, folderWorkspaceItemId: folderId } : t
                    ));
                    // Patch the open tab using the stable shell tab.id.
                    // patchTab's functional updater reads fresh store state — safe even
                    // though this hook's openTabs closure is stale at this point.
                    patchTab(tab.id, (cur) => ({
                        data: { ...(cur.data as Task), folderWorkspaceItemId: folderId },
                        data0: cur.data0 ? { ...(cur.data0 as Task), folderWorkspaceItemId: folderId } : cur.data0,
                    }));
                });
            }
        }
    };

    return { handles, onSave };
}


