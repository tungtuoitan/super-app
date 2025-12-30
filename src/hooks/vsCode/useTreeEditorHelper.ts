import { useCallback } from "react";
import { useSnackbar } from "notistack";
import type { Note } from "@/types/note.types";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useEditorTabsStore } from "@/store/index";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { workspaceService } from "@/services/workspace.service";
import { WorkspaceItemAction, UpsertWorkspaceItemRequest } from "@/types/workspace.types";
import { useWorkspaceLoader } from "../workspace/useWorkspace.loader";
import { WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { useNoteDetailHelper } from "../note/useNoteDetail.helper";
import { SPECIAL_IDS } from "@/utils/temp-id.utils";
import { isNumber } from "lodash";

export const useTreeEditorHelper = () => {
    const { enqueueSnackbar } = useSnackbar();
    const { getActiveTab } = useEditorTabHelper();
    const { originalNoteRef } = useNoteDetailStore();
    const { setOpenTabs } = useEditorTabsStore();
    const { $user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();
    const { upsertNote } = useNoteDetailHelper();

    const upsertNoteFromTree = useCallback(async () => {
        // =====================================
        // WORKSPACE NOTE HANDLER
        // =====================================
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const noteData = activeTab.data as Note;

        // Find corresponding workspace item in currentWorkspace.flatData
        const workspaceItem = currentWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === noteData.id);

        if (!workspaceItem) {
            console.warn("⚠️ Note not found in workspace tree");
            enqueueSnackbar("Note not found in workspace tree", { variant: "error" });
            return;
        }

        // Determine action based on workspaceItem.id
        const isNewWorkspaceItem = workspaceItem.id < 0;
        const token = $user.userToken;

        if (isNewWorkspaceItem) {
            // =====================================
            // CREATE: Create new note entity + workspace_item in one transaction
            // API will create both note and workspace_item automatically
            // =====================================
            const request: UpsertWorkspaceItemRequest = {
                action: WorkspaceItemAction.Create,
                entityType: 3, // Note
                parentId: isNumber(workspaceItem.parentId) && SPECIAL_IDS.includes(workspaceItem.parentId) ? null : workspaceItem.parentId ?? null, // Parent workspace_items.id
                noteData: {
                    userId: noteData.userId,
                    name: noteData.name,
                    description: noteData.description || null,
                    statusCode: noteData.statusCode || null,
                    deletedAt: noteData.deletedAt ? noteData.deletedAt.toISOString() : null,
                },
            };

            console.log("🔹 Creating note in workspace:", request);
            const result = await workspaceService._upsertWorkspaceItems(token ?? "", currentWorkspace?.id ?? 0, [request]);

            if (!result.success) {
                throw new Error(result.message || "Failed to create note");
            }

            // remove old temporary workspace item
            const newFlatData = currentWorkspace?.flatData.filter((item) => item.id !== workspaceItem.id) || [];

            // update openTabs to replace temporary workspace item id with real one after reload
            const newWorkspace = await loadTree(newFlatData.filter((item) => item.id < 0));

            // Extract created note ID from response
            // API returns Data: List<WorkspaceItemEntity> with entityId = real note ID
            if (result.data && result.data.length > 0) {
                const _createdItem = result.data[0];
                const _workspaceItemFromDB: WorkspaceItemV2 | undefined = newWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === _createdItem.entityId);
                if (!_workspaceItemFromDB) {
                    throw new Error("Failed to find created workspace item in reloaded data");
                }

                console.log("✅ Note created with ID:", _createdItem.entityId, "WorkspaceItem ID:", _createdItem.id);

                // Update tab data with real IDs
                setOpenTabs((prev) =>
                    prev.map((tab) => {
                        if (tab.id === activeTab.id) {
                            const updatedNote: Note = {
                                ...(_workspaceItemFromDB.data as any as Note),
                                id: _createdItem.entityId,
                            };
                            return {
                                ...tab,
                                data: updatedNote,
                                title: updatedNote.name,
                                hasUnsavedChanges: false,
                            };
                        }
                        return tab;
                    })
                );

                // Update originalNoteRef
                originalNoteRef.current = {
                    ...noteData,
                    id: _createdItem.entityId,
                };

                enqueueSnackbar("Note created successfully", { variant: "success" });
            }
        } else {
            // =====================================
            // UPDATE: Update existing note entity
            // =====================================
            const savedNote = await upsertNote(activeTab.id);
            if (!savedNote) {
                throw new Error("Failed to update note");
            }
            // Note: upsertNote already shows success notification
        }
    }, [getActiveTab, currentWorkspace, $user, loadTree, setOpenTabs, originalNoteRef, enqueueSnackbar, upsertNote]);

    return {
        upsertNoteFromTree,
    };
};
