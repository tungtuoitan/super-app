import { useSnackbar } from "notistack";
import { useNoteGridPopupStore } from "@/store/workspace/NoteGridPopup.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { workspaceService } from "@/services/workspace.service";
import { KuseWorkspaceLoader } from "./KuseWorkspace.loader";
import { WorkspaceItemAction } from "@/types/workspace.types";
import type { UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import {useConsoleHelper} from "../console/useConsole.helper";

/**
 * Hook for NoteGridPopup business logic
 * Reuses existing notes data from useNoteGridStore 
 */
export function useNoteGridPopupHelper() {
    const _console = useConsoleHelper();
    const { loadTree } = KuseWorkspaceLoader();

    // Store state
    const {
        targetFolder,
        setIsSubmitting,
        setIsNoteGridPopupOpen,
        setTargetFolder,
    } = useNoteGridPopupStore();

    // Note grid state (reuse existing data)
    const { notes, noteGridRowSelection, setNoteGridRowSelection } = useNoteGridStore();

    // Workspace state
    const { currentWorkspace } = useWorkspaceStore();

    // Auth
    const { $user } = useAuthStore();
    const token = $user.userToken;

    /**
     * Open popup (reuse existing notes data)
     */
    const openNoteGridPopup = (folderInfo: {
        id: number;
        name: string;
        entityId: number;
    }) => {
        setTargetFolder(folderInfo);
        setNoteGridRowSelection({});
        setIsNoteGridPopupOpen(true);
    };

    /**
     * Close popup and reset state
     */
    const closeNoteGridPopup = () => {
        setIsNoteGridPopupOpen(false);
        setTargetFolder(null);
        setNoteGridRowSelection({});
    };

    /**
     * Add selected notes to target folder
     */
    const addNotesToFolder = async () => {
        if (!targetFolder) {
            _console.error("No target folder selected");
            return;
        }

        // Get selected note IDs from row selection
        // noteGridRowSelection keys are note IDs (as strings), not array indices
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
            // Build batch requests for ADD action
            const requests: UpsertWorkspaceItemRequest[] = selectedNoteIds.map(noteId => ({
                action: WorkspaceItemAction.Add,
                entityType: 3,
                entityId: noteId,
                parentId: targetFolder.id,
            }));

            // Call batch API
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
