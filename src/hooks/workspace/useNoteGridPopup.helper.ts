import { useSnackbar } from "notistack";
import { useNoteGridPopupStore } from "@/store/workspace/NoteGridPopup.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { workspaceService } from "@/services/workspace.service";
import { useWorkspaceLoader } from "./useWorkspace.loader";
import { WorkspaceItemAction } from "@/types/workspace.types";
import type { UpsertWorkspaceItemRequest } from "@/types/workspace.types";

/**
 * Hook for NoteGridPopup business logic
 * Reuses existing notes data from useNoteGridStore
 */
export function useNoteGridPopupHelper() {
    const { enqueueSnackbar } = useSnackbar();
    const { loadTree } = useWorkspaceLoader();

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
            enqueueSnackbar("No target folder selected", { variant: "error" });
            return;
        }

        // Get selected note IDs from row selection
        // noteGridRowSelection keys are note IDs (as strings), not array indices
        const selectedNoteIds = Object.keys(noteGridRowSelection)
            .filter(key => noteGridRowSelection[key])
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (selectedNoteIds.length === 0) {
            enqueueSnackbar("Please select at least one note", { variant: "warning" });
            return;
        }

        if (!currentWorkspace?.id) {
            enqueueSnackbar("No workspace selected", { variant: "error" });
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
                enqueueSnackbar(
                    `Added ${selectedNoteIds.length} note(s) to "${targetFolder.name}"`,
                    { variant: "success" }
                );

                await loadTree();
                closeNoteGridPopup();
            } else {
                enqueueSnackbar(result.message || "Failed to add notes", { variant: "error" });
            }
        } catch (error: any) {
            console.error("Failed to add notes to folder:", error);
            enqueueSnackbar(error?.message || "Failed to add notes", { variant: "error" });
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
