import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { Note, UpsertNoteDTO } from "@/types/note.types";
import { noteService } from "@/services/note.service";
import { workspaceService } from "@/services/workspace.service";
import { constants } from "@/utils/constants";
import { useNoteGridHelper } from "./useNoteGrid.helper";
import { useWorkspaceOperation } from "../explorer/useWorkspaceOperation.helper";
import { useExplorerStore } from "@/store/explorer/Explorer.store";
import { transformNoteData } from "@/utils/note.utils";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";

export const useNoteDetailHelper = () => {
    const { auth } = useAuthStore();
    const { selectedNote } = useNoteGridStore();
    const { originalNoteRef } = useNoteDetailStore();
    const { setSelectedNote } = useNoteGridStore();
    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceOperation();
    const { currentTree } = useExplorerStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();

    const handleNoteFieldChange = (field: keyof Note, value: any) => {
        setOpenTabs((prev: BaseTab[]) => prev.map((t: BaseTab) => (t.id === activeTabId ? { ...t, hasUnsavedChanges: true } : t)));

        if (!selectedNote) return;
        const updated = { ...selectedNote, [field]: value };
        setSelectedNote(updated);
    };

    /**
     * Save current note (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const upsertNote = useCallback(
        async (tabId?: string): Promise<Note | null> => {
            if (!selectedNote) {
                console.warn("⚠️ No selected note to upsert");
                return null;
            }

            // ============================================================
            // Step 2: Determine operation mode (create/update/restore)
            // ============================================================
            const isCreateMode = selectedNote.id <= 0;
            const isRestoreMode = selectedNote.id > 0 && originalNoteRef.current?.deletedAt && !selectedNote.deletedAt;
            const token = auth.userToken;

            try {
                // ============================================================
                // Step 3: Prepare upsert data with proper tag handling
                // ============================================================
                const upsertData: UpsertNoteDTO = {
                    id: isCreateMode ? 0 : selectedNote.id, // Always use 0 for create
                    name: selectedNote.name,
                    description: selectedNote.description,
                    // Send hashtags for workspace notes, or tags for regular notes
                    tags:
                        selectedNote.hashtags && selectedNote.hashtags.length > 0
                            ? selectedNote.hashtags.map((h: any) => (typeof h === "number" ? h : h?.id || h?.tagId)) // Extract IDs from hashtags
                            : selectedNote.tags?.map((tag: any) => tag.tagId), // Otherwise use tags
                    type: selectedNote.type,
                    deletedAt: isRestoreMode ? null : undefined, // null = restore, undefined = don't touch
                };

                // ============================================================
                // Step 4: Call batch API to upsert note
                // ============================================================
                const result = await noteService._upsertNotes(token, [upsertData]);
                if (!result.success) {
                    throw new Error(result.message || "Failed to save note");
                }

                // ============================================================
                // Step 6: Extract and validate saved note from response
                // ============================================================
                const batchResult = result.object as any;
                const savedNote = batchResult?.notes?.[0];

                if (!savedNote) {
                    throw new Error("Failed to save note: No data returned from server");
                }
                const transformedNote = transformNoteData(savedNote);

                // ============================================================
                // Step 8: If creating from workspace tree, add to workspace_items
                // ============================================================
                if (isCreateMode && selectedNote.hashtags && selectedNote.hashtags.length > 0) {
                    // Extract folder ID - hashtags can be number[] or Folder[]
                    const firstHashtag = selectedNote.hashtags[0];
                    const parentFolderId = typeof firstHashtag === "number" ? firstHashtag : (firstHashtag as any)?.id || (firstHashtag as any)?.tagId;

                    const workspaceId = currentTree?.workspaceId;

                    if (workspaceId && parentFolderId) {
                        try {
                            await workspaceService._addItemToWorkspace(token, workspaceId, {
                                parentTagId: parentFolderId,
                                childType: constants.workspace.itemTypes.note,
                                childId: transformedNote.id,
                            });
                        } catch (error) {
                            console.error("❌ Failed to add note to workspace:", error);
                            // Don't fail the whole save if this fails - note is still created
                        }
                    } else {
                        console.warn("⚠️ No workspace ID or parent folder ID found, skipping workspace_items insert");
                    }
                }

                // ============================================================
                // Step 10: Update selected note in store with server response
                // ============================================================
                enqueueSnackbar(isCreateMode ? "Note created successfully" : "Note saved successfully", { variant: "success" });
                setSelectedNote(transformedNote);
                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) => {
                            if (tab.id === tabId) {
                                return {
                                    ...tab,
                                    noteId: transformedNote.id,
                                    title: transformedNote.name || "Unsaved Note",
                                    note: transformedNote,
                                };
                            }
                            return tab;
                        }),
                    );
                }

                originalNoteRef.current = { ...selectedNote };
                await loadNotes();

                if (isCreateMode && currentTree?.workspaceId) {
                    await loadTree(currentTree.workspaceId);
                }

                return transformedNote;
            } catch (error) {
                console.error("❌ Failed to save note:", error);
                const errorMessage = await parseApiError(error);

                if (isUnauthorizedError(error)) {
                    enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
                } else {
                    enqueueSnackbar(`Failed to save note: ${errorMessage}`, { variant: "error" });
                }
                return null;
            }
        },
        [selectedNote, loadNotes, loadTree, currentTree],
    );

    return {
        upsertNote,
        handleNoteFieldChange,
    };
};
