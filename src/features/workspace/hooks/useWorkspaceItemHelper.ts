
import type { Note } from "@/features/note";
import { useEditorTabHelper } from "@/shell";
import { useAuthStore } from "@/shared";
import { useWorkspaceStore } from "../store/Workspace.store";
import { workspaceService } from "../service/workspace.service";
import { WorkspaceItemAction, UpsertWorkspaceItemRequest } from "../types/workspace.types";
import { useWorkspaceLoader } from "./useWorkspace.loader";
import { isNumber } from "lodash";
import {useConsoleHelper} from "@/shared";
import {useEditorTabBarStore} from "@/shell";
import {SPECIAL_IDS} from "../utils/temp-id.utils";

export const useWorkspaceItemHelper = () => {
    const _console = useConsoleHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { setOpenTabs, activeTabId } = useEditorTabBarStore();
    const { $user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();

    //* hàm này phục vụ cho save button trong Editor Toolbar và batch save
    const upsertWorkspaceItem = 
        async (action: WorkspaceItemAction, tabIds?: string[]): Promise<boolean> => {
            const token = $user.userToken;

            switch (action) {
                case WorkspaceItemAction.Create:
                    // =====================================
                    // Collect tabs to process
                    // =====================================
                    const tabsToProcess =
                        tabIds && tabIds.length > 0 ? tabIds.map((id) => getActiveTab(id)).filter((tab) => tab !== null) : [getActiveTab()].filter((tab) => tab !== null);

                    if (tabsToProcess.length === 0) {
                        console.warn("⚠️ No tabs to process");
                        return false;
                    }

                    // =====================================
                    // Build batch requests for all tabs
                    // =====================================
                    const batchRequests: UpsertWorkspaceItemRequest[] = [];
                    const tabWorkspaceItemMap = new Map<string, { tabId: string; tempWorkspaceItemId: number; noteData: Note }>();

                    for (const tab of tabsToProcess) {
                        if(!tab) continue;
                        const noteData = tab.data as Note;
                        const workspaceItem = currentWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === noteData.id);

                        if (!workspaceItem) {
                            console.warn(`⚠️ Note not found in workspace tree: ${noteData.name}`);
                            _console.warning(`Note not found in workspace tree: ${noteData.name}`);
                            return false;
                        }

                        // Build request for this tab
                        const request: UpsertWorkspaceItemRequest = {
                            action: WorkspaceItemAction.Create,
                            entityType: 3, // Note
                            parentId: isNumber(workspaceItem.parentId) && SPECIAL_IDS.includes(workspaceItem.parentId) ? null : workspaceItem.parentId ?? null,
                            noteData: {
                                userId: noteData.userId,
                                name: noteData.name,
                                description: noteData.description || null,
                                statusCode: noteData.statusCode || null,
                                icon: noteData.icon || null,
                                color: noteData.color || null,
                                deletedAt: noteData.deletedAt ? noteData.deletedAt.toISOString() : null,
                            },
                        };

                        batchRequests.push(request);
                        tabWorkspaceItemMap.set(tab.id, {
                            tabId: tab.id,
                            tempWorkspaceItemId: workspaceItem.id,
                            noteData,
                        });
                    }

                    if (batchRequests.length === 0) {
                        console.warn("⚠️ No valid requests to process");
                        return false;
                    }

                    // =====================================
                    // Call batch API once for all tabs
                    // =====================================
                    const result = await workspaceService._upsertWorkspaceItems(token ?? "", currentWorkspace?.id ?? 0, batchRequests);

                    if (!result.success) {
                        const errorMessage = result.message || "Failed to create notes";
                        console.error("⚠️ Failed to create notes:", errorMessage);
                        _console.error(errorMessage);
                        return false;
                    }

                    // =====================================
                    // Remove old temporary workspace items
                    // =====================================
                    const tempWorkspaceItemIds = Array.from(tabWorkspaceItemMap.values()).map((item) => item.tempWorkspaceItemId);
                    const newFlatData = currentWorkspace?.flatData.filter((item) => !tempWorkspaceItemIds.includes(item.id)) || [];

                    // =====================================
                    // Reload tree to get new workspace items
                    // =====================================
                    const newWorkspace = await loadTree(newFlatData.filter((item) => item.id < 0));

                    // =====================================
                    // Update all tabs with real IDs from response
                    // =====================================
                    if (result.data && result.data.length > 0) {
                        setOpenTabs((prev) =>
                            prev.map((tab) => {
                                const tabInfo = tabWorkspaceItemMap.get(tab.id);
                                if (!tabInfo) return tab;

                                // Find corresponding created item in response
                                const createdItem = result.data?.find((item: any) => item.entityType === 3);

                                if (!createdItem) return tab;

                                // Find workspace item from reloaded data
                                const workspaceItemFromDB = newWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === createdItem.entityId);

                                if (!workspaceItemFromDB) return tab;

                                // Update tab with real data
                                const updatedNote: Note = {
                                    ...(workspaceItemFromDB.data as any as Note),
                                    id: createdItem.entityId,
                                };

                                return {
                                    ...tab,
                                    data: updatedNote,
                                    data0: updatedNote, // Set data0 to saved state after creation
                                    title: updatedNote.name,
                                    // hasUnsavedChanges will be auto-calculated
                                };
                            })
                        );

                        const count = result.data.length;
                        _console.success(count === 1 ? "Note created successfully" : `${count} notes created successfully`);
                        return true;
                    }
                    return false;
                default:
                    console.warn(`⚠️ Unsupported action: ${action}`);
                    _console.error(`Unsupported action: ${action}`);
                    return false;
            }
        }

    return {
        upsertWorkspaceItem,
    };
};
