import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { useWorkspaceStore } from "../store/workspace.store";
import { useConfirmationPopoverHelper, useMenuContextHelper } from "@/shared";
import { getWorkspaceConfirmMessage } from "../utils/confirmMessage";
import { useAuthStore } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useMenuContext } from "@/shared";
import { filterTopLevelParents, buildTreeFromV2Items } from "../utils/workspace.tree.utils";
import type { UpsertWorkspaceItemRequest } from "../types/workspace.types";
import { WorkspaceItemAction } from "../types/workspace.types";
import type { WorkspaceItemV2 } from "@/features/workspace/types/workspace-v2.types";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import { useEditorTabBarHelper } from "@/shell";
import { useConsoleHelper } from "@/shared";
import { workspaceService } from "../service/workspace.service";
import type { Folder } from "@/features/workspace/types/folder.types";

// ── Private helpers ────────────────────────────────────────────────

const $getAllVisibleFolderIds = (items: any[]): number[] => {
    const result: number[] = [];
    function $traverse(nodes: any[]) {
        for (const node of nodes) {
            if (node.id) result.push(node.id);
            if (node.children?.length > 0) $traverse(node.children);
        }
    }
    $traverse(items);
    return result;
};

const $collectAllDescendants = (folder: Folder): Folder[] => {
    const descendants: Folder[] = [folder];
    if (folder.children?.length > 0) {
        for (const child of folder.children) descendants.push(...$collectAllDescendants(child));
    }
    return descendants;
};

const $findFolderById = (items: any[], folderId: number): Folder | null => {
    for (const item of items) {
        if (item.id === folderId) return item;
        if (item.children?.length > 0) {
            const found = $findFolderById(item.children, folderId);
            if (found) return found;
        }
    }
    return null;
};

const $countChildren = (folder: any): number => {
    if (!folder.children || folder.children.length === 0) return 0;
    return folder.children.length + folder.children.reduce((sum: number, child: any) => sum + $countChildren(child), 0);
};

const $removeItems = (items: any[], idsToRemove: Set<number>): any[] =>
    items
        .filter((item) => !idsToRemove.has(item.id))
        .map((item) => ({ ...item, children: item.children ? $removeItems(item.children, idsToRemove) : [] }));

const $findItemById = (items: WorkspaceItemV2[], targetId: number): WorkspaceItemV2 | null =>
    items.find(item => item.id === targetId) || null;

// ── Hook ───────────────────────────────────────────────────────────

export const useWorkspaceFolderDeleteMenuHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { processTabAfterDelete } = useEditorTabBarHelper();

    const selectedCount = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;

    const __deleteItems = async (folder: Folder, isHardDelete: boolean = false) => {
        if (!folder.id) {
            _console.error("Cannot remove folder: missing folder information");
            return;
        }

        let nextFolderIdToSelect: number | null = null;
        if (currentWorkspace?.flatData) {
            const allVisibleFolderIds = $getAllVisibleFolderIds(currentWorkspace.flatData);
            const currentIndex = allVisibleFolderIds.indexOf(folder.id);
            if (currentIndex !== -1) {
                if (currentIndex < allVisibleFolderIds.length - 1) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex + 1];
                } else if (currentIndex > 0) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex - 1];
                }
            }
        }

        const allFolders = $collectAllDescendants(folder);
        const foldersToDelete = allFolders.filter((f) => !!f.id);

        try {
            const token = $user.userToken;
            const deleteItems = foldersToDelete.map((f) => {
                const itemType = (f as any).type;
                let type: 2 | 3 | 4 = 2;
                if (itemType === workspaceConstants.itemTypes.note) type = 3;
                else if (itemType === workspaceConstants.itemTypes.file) type = 4;
                return { id: f.id!, type };
            });

            const result = await workspaceService._deleteWorkspaceItems(token || "", currentWorkspace?.id || 1, { items: deleteItems, isHardDelete });

            if (result?.success) {
                if (currentWorkspace) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentWorkspace.flatData, idsToRemove);
                    setCurrentWorkspace({ ...currentWorkspace, flatData: updatedItems });
                    if (nextFolderIdToSelect !== null) {
                        setSelectedItemIds([nextFolderIdToSelect]);
                        setLastSelectedItemId(nextFolderIdToSelect);
                    } else {
                        setSelectedItemIds([]);
                        setLastSelectedItemId(null);
                    }
                }
                _console.success(`Folder${isMultipleSelected ? "s" : ""} ${isHardDelete ? "permanently " : ""}deleted successfully`);
            } else {
                throw new Error("Failed to delete folders");
            }
        } catch (error) {
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) _console.error("Unauthorized. Please login again.");
            else _console.error(`Failed to delete folders: ${errorMessage}`);
        }
    };

    const __bulkDeleteFolders = async (selectedIds: number[], isHardDelete: boolean = false) => {
        if (!currentWorkspace?.flatData) return;

        const selectedFolders: Folder[] = [];
        for (const folderId of selectedIds) {
            const folder = $findFolderById(currentWorkspace.flatData, folderId);
            if (folder && folder.id >= 0) selectedFolders.push(folder);
        }
        if (selectedFolders.length === 0) return;

        const allVisibleFolderIds = $getAllVisibleFolderIds(currentWorkspace.flatData);
        let nextFolderIdToSelect: number | null = null;
        const selectedIndices = selectedIds.map((id) => allVisibleFolderIds.indexOf(id)).filter((idx) => idx !== -1).sort((a, b) => b - a);
        if (selectedIndices.length > 0) {
            const lastSelectedIndex = selectedIndices[0];
            if (lastSelectedIndex < allVisibleFolderIds.length - 1) {
                nextFolderIdToSelect = allVisibleFolderIds[lastSelectedIndex + 1];
            } else if (selectedIndices[selectedIndices.length - 1] > 0) {
                nextFolderIdToSelect = allVisibleFolderIds[selectedIndices[selectedIndices.length - 1] - 1];
            }
        }

        const allFoldersToDelete: Folder[] = [];
        for (const folder of selectedFolders) allFoldersToDelete.push(...$collectAllDescendants(folder));

        const uniqueFoldersMap = new Map<number, Folder>();
        for (const folder of allFoldersToDelete) {
            if (folder.id) uniqueFoldersMap.set(folder.id, folder);
        }
        const foldersToDelete = Array.from(uniqueFoldersMap.values());

        try {
            const token = $user.userToken;
            const deleteItems = foldersToDelete.map((f) => {
                const itemType = (f as any).type;
                let type: 2 | 3 | 4 = 2;
                if (itemType === workspaceConstants.itemTypes.note) type = 3;
                else if (itemType === workspaceConstants.itemTypes.file) type = 4;
                return { id: f.id!, type };
            });

            const result = await workspaceService._deleteWorkspaceItems(token || "", currentWorkspace?.id || 1, { items: deleteItems, isHardDelete });

            if (result?.message === "Items deleted successfully") {
                if (currentWorkspace) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    const updatedItems = $removeItems(currentWorkspace.flatData, idsToRemove);
                    setCurrentWorkspace({ ...currentWorkspace, flatData: updatedItems });
                    if (nextFolderIdToSelect !== null) {
                        setSelectedItemIds([nextFolderIdToSelect]);
                        setLastSelectedItemId(nextFolderIdToSelect);
                    } else {
                        setSelectedItemIds([]);
                        setLastSelectedItemId(null);
                    }
                }
                _console.success(`Folder${isMultipleSelected ? "s" : ""} ${isHardDelete ? "permanently " : ""}deleted successfully`);
            } else {
                throw new Error("Failed to bulk delete folders");
            }
        } catch (error) {
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) _console.error("Unauthorized. Please login again.");
            else _console.error(`Failed to delete folders: ${errorMessage}`);
        }
    };

    const __deleteRestore_SelectedItems = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        const selectedIds = ids ?? selectedItemIds;
        if (selectedIds.length === 0 || !currentWorkspace?.flatData) return;

        try {
            const token = $user.userToken;
            const treeData = buildTreeFromV2Items(currentWorkspace.flatData);
            const topLevelIds = filterTopLevelParents(selectedIds, treeData);
            if (topLevelIds.length === 0) return;

            const selectedItems: WorkspaceItemV2[] = [];
            for (const itemId of topLevelIds) {
                const item = $findItemById(currentWorkspace.flatData, itemId);
                if (item && item.id > 0) selectedItems.push(item);
            }
            if (selectedItems.length === 0) return;

            const uniqueItemsMap = new Map<number, WorkspaceItemV2>();
            for (const item of selectedItems) uniqueItemsMap.set(item.id, item);
            const itemsToUpdate = Array.from(uniqueItemsMap.values());

            const batchRequests: UpsertWorkspaceItemRequest[] = itemsToUpdate.map((item) => ({
                action: type === "soft-delete" ? WorkspaceItemAction.Delete : WorkspaceItemAction.Restore,
                id: item.id,
            }));

            const result = await workspaceService._upsertWorkspaceItems(token ?? "", currentWorkspace.id, batchRequests);
            if (!result.success) throw new Error(result.message || "Batch update failed");

            if (type === "soft-delete") {
                const folderIds = itemsToUpdate.filter((item) => item.entityType === 2).map((item) => item.id);
                const noteIds = itemsToUpdate.filter((item) => item.entityType === 3).map((item) => item.id);
                const fileIds = itemsToUpdate.filter((item) => item.entityType === 4).map((item) => item.id);
                if (folderIds.length > 0) processTabAfterDelete(folderIds, "folder");
                if (noteIds.length > 0) processTabAfterDelete(noteIds, "note");
                if (fileIds.length > 0) processTabAfterDelete(fileIds, "file");
            }

            const res = await workspaceService._getWorkspaceTreeV2(token ?? "", currentWorkspace.id);
            if (res?.success) {
                setCurrentWorkspace(res.object as WorkspaceDTO);
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
                _console.success(`Successfully ${type === "soft-delete" ? "deleted" : "restored"} ${itemsToUpdate.length} item(s)`);
            } else {
                throw new Error("Failed to reload workspace tree");
            }
        } catch (error) {
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) _console.error("Unauthorized. Please login again.");
            else _console.error(`Failed to update items: ${errorMessage}`);
        }
    };

    const dhr_items = (event: any, isHardDelete: boolean = false) => {
        if (!contextData) return;
        if (contextData.tagId < 0) {
            setIsMenuContextOpen(false);
            return;
        }
        setIsMenuContextOpen(false);

        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;
        const childCount = isMultipleSelected ? 0 : $countChildren(contextData);
        const entityName = isMultipleSelected ? undefined : contextData.name;

        const confirmMsg = getWorkspaceConfirmMessage({
            type: isHardDelete ? "hard-delete" : "soft-delete",
            entityType: "folder",
            count: selectedCount,
            isMultiple: isMultipleSelected,
            entityName,
            childCount,
        });

        showConfirmation({
            anchorEl: anchorElement,
            title: confirmMsg.title,
            subtitle: confirmMsg.subtitle,
            confirmText: isHardDelete ? "Delete Permanently" : "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => {
                if (isHardDelete) {
                    if (isMultipleSelected) __bulkDeleteFolders(selectedItemIds, isHardDelete);
                    else __deleteItems(contextData, isHardDelete);
                } else {
                    const isCurrentlyDeleted = contextData.deletedAt !== null && contextData.deletedAt !== undefined;
                    const operationType: "soft-delete" | "restore" = isCurrentlyDeleted ? "restore" : "soft-delete";
                    const idsToProcess = isMultipleSelected ? selectedItemIds : [contextData.id];
                    __deleteRestore_SelectedItems(idsToProcess, operationType);
                }
            },
        });
    };

    return { dhr_items };
};
