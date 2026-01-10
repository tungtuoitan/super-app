/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { constants } from "@/utils/constants";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useSnackbar } from "notistack";
import { useWorkspaceItemHelper } from "@/hooks/workspace/useWorkspaceItemHelper";
import { BaseTab } from "@/types/editor/tab.types";
import { findNoteByEntityId } from "@/hooks/keyword/useKeywordNavigation.helper";
import { Note } from "@/types/index";
import { WorkspaceItemAction } from "@/types/workspace.types";
import {useConsoleHelper} from "../console/useConsole.helper";

/**
 * Workspace View - WorkspaceTree for folder navigation with workspace selection
 */
export function useWorkspaceHelper() {
    const { currentWorkspace } = useWorkspaceStore();
    const { openTabs } = useEditorTabsStore();
    const { upsertWorkspaceItem } = useWorkspaceItemHelper();
    const _console = useConsoleHelper();

    // Handle workspace selection change
    const saveNewsBeforeNavigate = async (): Promise<boolean> => {
        const unsavedTabs = openTabs.filter((tab: BaseTab) => {
            if (tab.type !== constants.vscode.tab.tabTypes.note) return false;
            const note = tab.data as Note;
            const belongsToCurrentWorkspace = currentWorkspace && findNoteByEntityId(currentWorkspace, note.id);
            return belongsToCurrentWorkspace && note.id < 0;
        });

        if (unsavedTabs.length > 0) {
            _console.info(`Saving ${unsavedTabs.length} unsaved note(s)...`);
            try {
                const tabIdsToSave = unsavedTabs.map((tab) => tab.id);
                const saveSuccess = await upsertWorkspaceItem(WorkspaceItemAction.Create, tabIdsToSave);

                if (!saveSuccess) {
                    _console.error("Failed to save notes. Navigation cancelled.");
                    return false;
                }
                return true;
            } catch (error) {
                console.error("Failed to save tabs:", error);
                _console.error("Failed to save notes. Navigation cancelled.");
                return false;
            }
        }

        return true;
    };

    return {
        saveNewsBeforeNavigate,
    };
}
