import { useNoteGridPopupStore } from "../store/useNoteGridPopup.store";
import { useNoteGridStore } from "../store/useNoteGrid.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { workspaceService } from "@/services/workspace.service";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { WorkspaceItemAction } from "@/types/workspace.types";
import type { UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";

/**
 * Hook for NoteGridPopup business logic
 * Reuses existing notes data from useNoteGridStore
 */
export function useNoteGridPopupHelper() {
    const _console = useConsoleHelper();
    const { loadTree } = useWorkspaceLoader();

    const {
        targetFolder,
        setIsSubmitting,
        setIsNoteGridPopupOpen,
        setTargetFolder,
    } = useNoteGridPopupStore();

    const { notes, noteGridRowSelection, setNoteGridRowSelection } = useNoteGridStore();

    const { currentWorkspace } = useWorkspaceStore();

    const { $user } = useAuthStore();
    const token = $user.userToken;

    const openNoteGridPopup = (folderInfo: {
        id: number;
        name: string;
        entityId: number;
    }) => {
        setTargetFolder(folderInfo);
        setNoteGridRowSelection({});
        setIsNoteGridPopupOpen(true);
    };

    const closeNoteGridPopup = () => {
        setIsNoteGridPopupOpen(false);
        setTargetFolder(null);
        setNoteGridRowSelection({});
    };

    const addNotesToFolder = async () => {
        if (!targetFolder) {
            _console.error("No target folder selected");
            return;
        }

        const selectedNoteIds = Object.keys(noteGridRowSelection)
            .filter(key => noteGridRowSelection[key])
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (selectedNoteIds.length === 0) {
            _console.error("Please select at least one note");
            return;
        }

        if (!currentWorkspace?.id) {
            _console.error("No workspace selected");
            return;
        }

        setIsSubmitting(true);
        try {
            const requests: UpsertWorkspaceItemRequest[] = selectedNoteIds.map(noteId => ({
                action: WorkspaceItemAction.Add,
                entityType: 3,
                entityId: noteId,
                parentId: targetFolder.id,
            }));

            const result = await workspaceService._upsertWorkspaceItems(
                token,
                currentWorkspace.id,
                requests
            );

            if (result.success) {
                _console.error(
                    `Added ${selectedNoteIds.length} note(s) to "${targetFolder.name}"`,
                    { variant: "success" }
                );

                await loadTree();
                closeNoteGridPopup();
            } else {
                _console.error(result.message || "Failed to add notes");
            }
        } catch (error: any) {
            console.error("Failed to add notes to folder:", error);
            _console.error(error?.message || "Failed to add notes");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        openNoteGridPopup,
        closeNoteGridPopup,
        addNotesToFolder,
    };
}
