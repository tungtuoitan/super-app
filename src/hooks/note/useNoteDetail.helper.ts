import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { Note, UpsertNoteDTO } from "@/types/note.types";
import { noteService } from "@/services/note.service";
import { keywordService } from "@/services/keyword.service";
import { workspaceService } from "@/services/workspace.service";
import { constants } from "@/utils/constants";
import { useNoteGridHelper } from "./useNoteGrid.helper";
import { useWorkspaceLoader } from "../workspace/useWorkspace.loader";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { transformANote } from "@/utils/note.utils";
import { extractExternalLinks } from "@/utils/markdown.utils";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore, useStandardRegistryStore } from "@/store/index";
import { IAutoCompleteOptions } from "@/shared/components";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useStandardRegistryHelper } from "../standardRegistry/useStandardRegistry.helper";

export const useNoteDetailHelper = () => {
    const { $user } = useAuthStore();
    const { originalNoteRef } = useNoteDetailStore();
    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceLoader();
    const { currentWorkspace } = useWorkspaceStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { registries, registriesLoading, allKeywords } = useStandardRegistryStore();
    const { getActiveTab } = useEditorTabHelper();
    const { moduleName } = useGridControlStore();
    const { loadKeywords } = useStandardRegistryHelper();

    const handleNoteFieldChange = (field: keyof Note, value: any) => {
        
        // Get current note from active tab
        const activeTab = getActiveTab();
        if (!activeTab || activeTab.type !== constants.vscode.tab.tabTypes.note) {
            return;
        }

        const activeNote = activeTab.data as Note;

        // Extract value based on field type
        let _value;
        if (field === "statusCode") {
            // value is synthetic event with structure: { target: { value: { id, label, ... } } }
            _value = value?.target?.value?.id || null;
        } else {
            _value = value;
        }

        // Auto capitalize first letter for note name
        if (field === "name" && typeof _value === "string") {
            _value = _value.charAt(0).toUpperCase() + _value.slice(1);
        }

        const updated = { ...activeNote, [field]: _value };

        // Update tab data directly
        setOpenTabs((prev: BaseTab[]) => prev.map((t: BaseTab) => (t.id === activeTabId ? { ...t, data: updated, hasUnsavedChanges: true } : t)));
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
                // Step 3: Prepare upsert data with proper hashtag handling
                // ============================================================
                const upsertData: UpsertNoteDTO = {
                    id: isCreateMode ? 0 : activeNote.id, // Always use 0 for create
                    name: activeNote.name,
                    description: activeNote.description,
                    type: activeNote.type,
                    statusCode: activeNote.statusCode, // Include status code
                    deletedAt: isRestoreMode ? null : undefined, // null = restore, undefined = don't touch
                };

                // ============================================================
                // Step 3.5: Auto-insert external keywords if any found in description
                // ============================================================
                if (activeNote.description) {
                    const externalLinks = extractExternalLinks(activeNote.description);

                    if (externalLinks.length > 0) {
                        // Filter out links that already exist in allKeywords
                        const newExternalLinks = externalLinks.filter(link => {
                            return !allKeywords.some(k => k.type === 'external' && k.link === link.url);
                        });

                        // If there are new external links, upsert them
                        if (newExternalLinks.length > 0) {
                            try {
                                const upsertRequests = newExternalLinks.map(link => ({
                                    name: link.name,
                                    link: link.url,
                                }));

                                await keywordService._upsertExternalKeywords(token, upsertRequests);

                                // Reload keywords to update allKeywords state
                                loadKeywords();
                            } catch (err) {
                                // Log error but don't block note save
                                console.error("Failed to insert external keywords:", err);
                            }
                        }
                    }
                }

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

                // reload
                //TODO: chỉ reload khi thay đổi tên/status hoặc khi insert, ta sẽ triển khai sau khi đổi sang dùng
                if (moduleName === constants.modules.note) {
                    loadNotes();
                } else if (moduleName === constants.modules.workspace) {
                    loadTree();
                }

                loadKeywords();

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

    const handleHashTagsChange = (hashtagsString: string) => {
        // Convert comma-separated string of IDs back to hashtags array
        const hashtagIds = hashtagsString
            ? hashtagsString
                  .split(",")
                  .map((id) => id.trim())
                  .filter((id) => id)
            : [];

        // Convert hashtag IDs to Hashtag objects by finding them in the options
        const hashtagObjects = hashtagIds
            .map((hashtagId) => {
                const foundOption = hashtagOptions.find((option: IAutoCompleteOptions) => option.id === hashtagId);
                if (foundOption) {
                    return {
                        id: parseInt(foundOption.id as string),
                        name: foundOption.label,
                        description: foundOption.desc,
                        isActive: foundOption.active,
                        createdAt: new Date(),
                    };
                }
                return null;
            })
            .filter((hashtag) => hashtag !== null);

        handleNoteFieldChange("hashtags", hashtagObjects);
    };

    return {
        upsertNote,
        handleNoteFieldChange,
        handleHashTagsChange,
    };
};
