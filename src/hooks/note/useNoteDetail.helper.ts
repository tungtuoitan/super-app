import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { Note, UpsertNoteDTO } from "@/types/note.types";
import { noteService } from "@/services/note.service";
import { workspaceService } from "@/services/workspace.service";
import { constants } from "@/utils/constants";
import { useNoteGridHelper } from "./useNoteGrid.helper";
import { useWorkspaceLoader } from "../workspace/useWorkspace.loader";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { transformANote } from "@/utils/note.utils";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore, useStandardRegistryStore } from "@/store/index";
import { IAutoCompleteOptions } from "@/shared/components";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";

export const useNoteDetailHelper = () => {
    const { $user } = useAuthStore();
    const { originalNoteRef } = useNoteDetailStore();
    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceLoader();
    const { currentWorkspace } = useWorkspaceStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { registries, registriesLoading } = useStandardRegistryStore();
    const { getActiveTab } = useEditorTabHelper();

    const handleNoteFieldChange = (field: keyof Note, value: any) => {
        // Get current note from active tab
        const activeTab = getActiveTab();
        if (!activeTab || activeTab.type !== constants.vscode.tab.tabTypes.note) return;

        const activeNote = activeTab.data as Note;

        // Extract value based on field type
        let _value;
        if (field === "statusCode") {
            // value is synthetic event with structure: { target: { value: { id, label, ... } } }
            _value = value?.target?.value?.id || null;
            // console.log("Changing statusCode to:", _value, "from event:", value);
        } else {
            _value = value;
        }

        const updated = { ...activeNote, [field]: _value };

        // Update tab data directly
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t: BaseTab) => (t.id === activeTabId ? { ...t, data: updated, hasUnsavedChanges: true } : t))
        );
    };

    /**
     * Save current note (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const upsertNote = useCallback(
        async (tabId?: string): Promise<Note | null> => {
            // Get current note from active tab
            const activeTab = getActiveTab();
            if (!activeTab || activeTab.type !== constants.vscode.tab.tabTypes.note) {
                console.warn("⚠️ No note tab active to upsert");
                return null;
            }

            const activeNote = activeTab.data as Note;

            // ============================================================
            // Step 1.5: Validate name field
            // ============================================================
            if (!activeNote.name || activeNote.name.trim() === "") {
                enqueueSnackbar("Note name is required", { variant: "error" });
                return null;
            }

            // ============================================================
            // Step 2: Determine operation mode (create/update/restore)
            // ============================================================
            const isCreateMode = activeNote.id <= 0;
            const isRestoreMode = activeNote.id > 0 && originalNoteRef.current?.deletedAt && !activeNote.deletedAt;
            const token = $user.userToken;

            try {
                // ============================================================
                // Step 3: Prepare upsert data with proper tag handling
                // ============================================================
                const upsertData: UpsertNoteDTO = {
                    id: isCreateMode ? 0 : activeNote.id, // Always use 0 for create
                    name: activeNote.name,
                    description: activeNote.description,
                    // Send hashtags for workspace notes, or tags for regular notes
                    tags:
                        activeNote.hashtags && activeNote.hashtags.length > 0
                            ? activeNote.hashtags.map((h: any) => (typeof h === "number" ? h : h?.id || h?.tagId)) // Extract IDs from hashtags
                            : activeNote.tags?.map((tag: any) => tag.tagId), // Otherwise use tags
                    type: activeNote.type,
                    statusCode: activeNote.statusCode, // Include status code
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
                const savedNote = result?.data?.[0];

                if (!savedNote) {
                    throw new Error("Failed to save note: No data returned from server");
                }
                const transformedNote = transformANote(savedNote);

                // ============================================================
                // Step 8: If creating from workspace tree, add to workspace_items
                // ============================================================
                if (isCreateMode && activeNote.hashtags && activeNote.hashtags.length > 0) {
                    // Extract folder ID - hashtags can be number[] or Folder[]
                    const firstHashtag = activeNote.hashtags[0];
                    const parentFolderId = typeof firstHashtag === "number" ? firstHashtag : (firstHashtag as any)?.id || (firstHashtag as any)?.tagId;

                    const workspaceId = currentWorkspace?.id;

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
                // Step 10: Update tab data with server response
                // ============================================================
                enqueueSnackbar(isCreateMode ? "Note created successfully" : "Note saved successfully", { variant: "success" });
                
                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) => {
                            if (tab.id === tabId) {
                                return {
                                    ...tab,
                                    data: transformedNote,
                                    noteId: transformedNote.id,
                                    title: transformedNote.name || "Unsaved Note",
                                    note: transformedNote,
                                    hasUnsavedChanges: false,
                                };
                            }
                            return tab;
                        })
                    );
                }

                originalNoteRef.current = { ...transformedNote };
                await loadNotes();

                if (isCreateMode && currentWorkspace?.id) {
                    await loadTree();
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
        [loadNotes, loadTree, currentWorkspace, getActiveTab]
    );

    const hashtagOptions = registries
        .filter((r) => r.type === constants.standardRegistryFE.types.hashtag && r.isActive)
        .map((item) => ({
            id: item.code,
            label: item.code,
            desc: item.description || item.code,
            active: item.isActive,
        }));

    const handleTagsChange = (tagsString: string) => {
        // Convert comma-separated string of IDs back to hashtags array
        const tagIds = tagsString
            ? tagsString
                  .split(",")
                  .map((id) => id.trim())
                  .filter((id) => id)
            : [];

        // Convert hashtag IDs to Tag objects by finding them in the options
        const tagObjects = tagIds
            .map((tagId) => {
                const foundOption = hashtagOptions.find((option: IAutoCompleteOptions) => option.id === tagId);
                if (foundOption) {
                    return {
                        tagId: parseInt(foundOption.id as string),
                        name: foundOption.label,
                        description: foundOption.desc,
                        isActive: foundOption.active,
                        createdAt: new Date(),
                        id: parseInt(foundOption.id as string), // Add alias for backward compatibility
                    };
                }
                return null;
            })
            .filter((tag) => tag !== null);

        handleNoteFieldChange("tags", tagObjects);
    };

    return {
        upsertNote,
        handleNoteFieldChange,
        handleTagsChange,
    };
};
