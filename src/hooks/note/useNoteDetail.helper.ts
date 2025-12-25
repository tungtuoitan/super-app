import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { Note, UpsertNoteDTO } from "@/types/note.types";
import { _upsertNotesBatch } from "@/services/note.service";
import { _addItemToWorkspace } from "@/services/workspace.service";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";
import { useNoteGridHelper } from "./useNoteGrid.helper";
import { useWorkspaceOperation } from "../explorer/useWorkspaceOperation.helper";
import { useExplorerStore } from "@/store/explorer/Explorer.store";
import { transformNoteData } from "@/utils/note.utils";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import {useEditorTabsStore} from "@/store/index";

export const useNoteDetailHelper = () => {
    const { auth } = useAuthStore();
    const { selectedNote } = useNoteGridStore();
    const { noteHasChanges, setNoteHasChanges, originalNoteRef } = useNoteDetailStore();

    const { setSelectedNote } = useNoteGridStore();

    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceOperation();
    const { currentTree } = useExplorerStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setOpenTabs } = useEditorTabsStore();

    const updateSelectedNote = (updatedNote: Partial<Note>) => {
        if (!selectedNote) return;

        const updated = { ...selectedNote, ...updatedNote };

        // Check if this was originally a new note (originalRef has id === 0 or < 0)
        const wasNewNote = originalNoteRef.current?.id === 0 || (originalNoteRef.current?.id && originalNoteRef.current.id < 0);
        const isNowSaved = updated.id > 0;

        // If this was a new note and now has an ID, update the original reference
        if (wasNewNote && isNowSaved) {
            originalNoteRef.current = { ...updated };
            setNoteHasChanges(false);
            setSelectedNote(updated);
            return;
        }

        // For new notes that are still unsaved (id === 0 or < 0)
        if (updated.id === 0 || updated.id < 0) {
            const hasContent = updated.name?.trim() || updated.description?.trim() || (updated.tags && updated.tags.length > 0) || updated.type;

            setNoteHasChanges(!!hasContent);
        } else {
            // For existing notes, compare with original
            if (originalNoteRef.current) {
                const fieldsToCheck: (keyof Note)[] = ["name", "description", "type", "tags"];

                const hasChanges = fieldsToCheck.some((key) => {
                    const originalValue = originalNoteRef.current![key];
                    const updatedValue = updated[key];

                    // Deep comparison for arrays (tags)
                    if (Array.isArray(originalValue) && Array.isArray(updatedValue)) {
                        const originalTagIds = originalValue.map((t: any) => t.tagId || t.id).sort();
                        const updatedTagIds = updatedValue.map((t: any) => t.tagId || t.id).sort();
                        const isDifferent = JSON.stringify(originalTagIds) !== JSON.stringify(updatedTagIds);
                        return isDifferent;
                    }

                    // For other values, direct comparison
                    const isDifferent = originalValue !== updatedValue;
                    return isDifferent;
                });

                setNoteHasChanges(hasChanges);
            }
        }

        setSelectedNote(updated);
    };

    const markAsSaved = () => {
        if (selectedNote) {
            originalNoteRef.current = { ...selectedNote };
            setNoteHasChanges(false);
        }
    };

    const resetChanges = () => {
        if (originalNoteRef.current) {
            setSelectedNote({ ...originalNoteRef.current });
            setNoteHasChanges(false);
        }
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

            // Check if it's a new note (id === 0 or negative)
            const isCreateMode = selectedNote.id <= 0;
            const isRestoreMode = selectedNote.id > 0 && originalNoteRef.current?.deletedAt && !selectedNote.deletedAt;
            const token = auth.userToken;

            try {
                // Upsert data - works for create, update, soft delete, and restore
                const upsertData: UpsertNoteDTO = {
                    id: isCreateMode ? 0 : selectedNote.id, // Always use 0 for create
                    name: selectedNote.name,
                    description: selectedNote.description,
                    // ✅ Send hashtags for workspace notes, or tags for regular notes
                    tags:
                        selectedNote.hashtags && selectedNote.hashtags.length > 0
                            ? selectedNote.hashtags.map((h: any) => (typeof h === "number" ? h : h?.id || h?.tagId)) // Extract IDs from hashtags
                            : selectedNote.tags?.map((tag: any) => tag.tagId), // Otherwise use tags
                    type: selectedNote.type,
                    deletedAt: isRestoreMode ? null : undefined, // null = restore, undefined = don't touch
                };

                // Use batch API with single element array
                const result = await _upsertNotesBatch(token, [upsertData]);

                // Check API response success
                if (!result.success) {
                    throw new Error(result.message || "Failed to save note");
                }

                // Extract note from batch response (Notes array)
                const batchResult = result.object as any;
                const savedNote = batchResult?.notes?.[0];

                if (!savedNote) {
                    throw new Error("Failed to save note: No data returned from server");
                }

                // Transform dates from API response strings to Date objects
                const transformedNote = transformNoteData(savedNote);

                // ✅ If creating new note from workspace tree, add to workspace_items
                if (isCreateMode && selectedNote.hashtags && selectedNote.hashtags.length > 0) {
                    // Extract folder ID - hashtags can be number[] or Folder[]
                    const firstHashtag = selectedNote.hashtags[0];
                    const parentFolderId = typeof firstHashtag === "number" ? firstHashtag : (firstHashtag as any)?.id || (firstHashtag as any)?.tagId;

                    const workspaceId = currentTree?.workspaceId;

                    if (workspaceId && parentFolderId) {
                        try {
                            await _addItemToWorkspace(token, workspaceId, {
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

                enqueueSnackbar(isCreateMode ? "Note created successfully" : "Note saved successfully", { variant: "success" });

                // Update context with saved note from server
                setSelectedNote(transformedNote);

                // Update tab with saved note if tabId provided
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
                        })
                    );
                }

                // Mark as saved after all updates
                markAsSaved();

                // Reload note grid to reflect changes
                await loadNotes();

                // ✅ Reload workspace tree if note was added to workspace (NO PAGE RELOAD!)
                if (isCreateMode && currentTree?.workspaceId) {
                    await loadTree(currentTree.workspaceId);
                }

                return transformedNote;
            } catch (error) {
                console.error("❌ Failed to save note:", error);
                const errorMessage = await parseApiError(error);

                // Show specific message for unauthorized
                if (isUnauthorizedError(error)) {
                    enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
                } else {
                    enqueueSnackbar(`Failed to save note: ${errorMessage}`, { variant: "error" });
                }
                return null;
            }
        },
        [selectedNote, auth.userToken, setSelectedNote, markAsSaved, loadNotes, loadTree, currentTree, enqueueSnackbar]
    );

    return {
        selectedNote,
        noteHasChanges,
        updateSelectedNote,
        markAsSaved,
        resetChanges,
        setSelectedNote,
        upsertNote,
    };
};
