import { useCallback } from "react";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useEditorTabsStore } from "@/store/index";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useKStore } from "../store/K.store";
import { KService } from "../service/K.service";
import { KItemAction, KUpsertWorkspaceItemRequest } from "../types/K.types";
import { useKLoader } from "./useK.loader";
import { isNumber } from "lodash";
import {useConsoleHelper} from "../../../hooks/console/useConsole.helper";
import {SPECIAL_IDS} from "../utils/temp-id.utils";
import {Note} from "../types/note.types";

export const KuseWorkspaceItemHelper = () => {
    const _console = useConsoleHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { $user } = useAuthStore();
    const { currentK } = useKStore();
    const { loadTree } = useKLoader();

    //* hàm này phục vụ cho save button trong Editor Toolbar và batch save
    const upsertWorkspaceItem = useCallback(
        async (action: KItemAction, tabIds?: string[]): Promise<boolean> => {
            const token = $user.userToken;

            switch (action) {
                case KItemAction.Create:
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
                    const batchRequests: KUpsertWorkspaceItemRequest[] = [];
                    const tabWorkspaceItemMap = new Map<string, { tabId: string; tempWorkspaceItemId: number; noteData: Note }>();

                    for (const tab of tabsToProcess) {
                        if(!tab) continue;
                        const noteData = tab.data as Note;
                        // K items are self-contained nodes — match by name as fallback
                        const workspaceItem = currentK?.flatData.find((item) => item.name === noteData.name);

                        if (!workspaceItem) {
                            console.warn(`⚠️ Note not found in kworkspace tree: ${noteData.name}`);
                            _console.warning(`Note not found in kworkspace tree: ${noteData.name}`);
                            return false;
                        }

                        // Build request for this tab
                        const request: KUpsertWorkspaceItemRequest = {
                            action: KItemAction.Create,
                            parentId: isNumber(workspaceItem.parentId) && SPECIAL_IDS.includes(workspaceItem.parentId) ? null : workspaceItem.parentId ?? null,
                            nodeData: {
                                name: noteData.name,
                                description: noteData.description || null,
                                icon: noteData.icon || null,
                                color: noteData.color || null,
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
                    const result = await KService._upsertWorkspaceItems(token ?? "", currentK?.id ?? 0, batchRequests);

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
                    const newFlatData = currentK?.flatData.filter((item) => !tempWorkspaceItemIds.includes(item.id)) || [];

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

                                // Find corresponding created item in response (first item since K has no entityType)
                                const createdItem = result.data?.[0];

                                if (!createdItem) return tab;

                                // Find workspace item from reloaded data by id
                                const workspaceItemFromDB = newWorkspace?.flatData.find((item) => item.id === createdItem.id);

                                if (!workspaceItemFromDB) return tab;

                                // Update tab with real data from K node
                                const updatedNote: Note = {
                                    ...(tab.data as Note),
                                    id: workspaceItemFromDB.id,
                                    name: workspaceItemFromDB.name,
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
        },
        [getActiveTab, currentK, $user, loadTree, setOpenTabs]
    );

    return {
        upsertWorkspaceItem,
    };
};

