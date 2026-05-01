import { constants } from "@/shared";
import { shellConstants } from "@/shell/shell.constants";
import { useProjectDetailHelper } from "./useProjectDetail.helper";
import { useTaskDetailHelper } from "@/features/taskDetail";
import { useProjectTaskFolderHelper } from "./useProjectTaskFolderHelper";
import { useDebugLog } from "@/shared";
import type { BaseTab } from "@/shell";
import type { Task } from "@/features/taskDetail";
import {SaveActions} from "@/shell";

export function useProjectSaveActions(): SaveActions {
    const { upsertProject } = useProjectDetailHelper();
    const { upsertTask } = useTaskDetailHelper();
    const { createTaskFolder } = useProjectTaskFolderHelper();
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
            const savedTask = await upsertTask(tab.id);
            if (isNewTask && savedTask) {
                await createTaskFolder(savedTask);
            }
        }
    };

    return { handles, onSave };
}


