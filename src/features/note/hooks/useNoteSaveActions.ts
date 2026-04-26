
import { constants } from "@/utils/constants";
import { useNoteDetailHelper } from "./useNoteDetail.helper";
import { useWorkspaceItemHelper } from "@/features/workspace/hooks/useWorkspaceItemHelper";
import { useWorkspaceStore } from "@/features/workspace/store/Workspace.store";
import { WorkspaceItemAction } from "@/features/workspace/types/workspace.types";
import { useProjectTaskFolderHelper } from "@/features/project";
import type { BaseTab } from "@/shell/types/tab.types";
import type { Note } from "../types/note.types";
import {SaveActions} from "@/types/actions.types";

export function useNoteSaveActions(): SaveActions {
    const { upsertNote } = useNoteDetailHelper();
    const _treeEditor = useWorkspaceItemHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { addNoteToTaskFolder } = useProjectTaskFolderHelper();

    const handles = (tabType: string) => tabType === constants.vscode.tab.tabTypes.note;

    const onSave = async (tab: BaseTab) => {
        const data = tab.data as Note;
        const workspaceItem = currentWorkspace?.flatData.find(
            (item) => item.entityType === 3 && item.entityId === data.id
        );

        // Regular upsert (note exists or not in workspace tree)
        if (!workspaceItem || workspaceItem.id > 0) {
            const savedNote = await upsertNote(tab.id);
            if (!savedNote) {
                throw new Error("Failed to update note");
            }

            // POST-SAVE: If note was created from a task, add it to the task's folder
            const taskMeta = tab.metadata;
            if (taskMeta?.taskId && taskMeta?.folderWorkspaceItemId && data.id < 0) {
                await addNoteToTaskFolder(savedNote, tab);
            }
        }
        // CREATE new entity + workspace_item via workspace API
        else if (workspaceItem.id < 0 && data.id < 0) {
            await _treeEditor.upsertWorkspaceItem(WorkspaceItemAction.Create);
        } else {
            console.error("Unexpected case in note save");
        }
    }
    return { handles, onSave };
}
