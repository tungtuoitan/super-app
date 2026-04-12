import { useCallback } from "react";
import { constants } from "@/utils/constants";
import { useProjectDetailHelper } from "@/hooks/project/useProjectDetail.helper";
import { useTaskDetailHelper } from "@/hooks/task/useTaskDetail.helper";
import { useProjectTaskFolderHelper } from "./useProjectTaskFolderHelper";
import { debugLog } from "@/hooks/debugLog/useDebugLog";
import type { SaveActions } from "@/shell/hooks/useSaveActions.types";
import type { BaseTab } from "@/types/editor/tab.types";
import type { Task } from "@/store/task/useTask.store";

export function useProjectSaveActions(): SaveActions {
    const { upsertProject } = useProjectDetailHelper();
    const { upsertTask } = useTaskDetailHelper();
    const { createTaskFolder } = useProjectTaskFolderHelper();

    const handles = (tabType: string) =>
        tabType === constants.vscode.tab.tabTypes.project ||
        tabType === constants.vscode.tab.tabTypes.task;

    const onSave = useCallback(async (tab: BaseTab) => {
        if (tab.type === constants.vscode.tab.tabTypes.project) {
            await upsertProject(tab.id);
        } else if (tab.type === constants.vscode.tab.tabTypes.task) {
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
    }, [upsertProject, upsertTask, createTaskFolder]);

    return { handles, onSave };
}
