import { constants } from "@/utils/constants";
import { useProjectDetailHelper } from "./useProjectDetail.helper";
import { useTaskDetailHelper } from "@/features/task/hooks/useTaskDetail.helper";
import { useProjectTaskFolderHelper } from "./useProjectTaskFolderHelper";
import { debugLog } from "@/shell/hooks/useDebugLog";
import type { BaseTab } from "@/shell/types/tab.types";
import type { Task } from "@/features/task/store/useTask.store";
import {SaveActions} from "@/types/actions.types";

export function useProjectSaveActions(): SaveActions {
    const { upsertProject } = useProjectDetailHelper();
    const { upsertTask } = useTaskDetailHelper();
    const { createTaskFolder } = useProjectTaskFolderHelper();

    const handles = (tabType: string) =>
        tabType === constants.vscode.tab.tabTypes.project ||
        tabType === constants.vscode.tab.tabTypes.task;

    const onSave = async (tab: BaseTab) => {
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
    };

    return { handles, onSave };
}
