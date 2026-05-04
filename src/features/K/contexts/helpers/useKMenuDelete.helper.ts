import { useKStore } from "../../store/useK.store";
import { KService } from "../../service/K.service";
import { KItemV2 } from "../../types/kV2.type";
import { KUpsertWorkspaceItemRequest, KItemAction } from "../../types/k.type";
import { KDTO } from "../../types/kDto.type";
import { KtreeMiniHelper } from "../../hooks/kTree/Ktree.miniHelper";
import { useEditorTabBarHelper } from "@/shell";
import { isUnauthorizedError, parseApiError, useAuthStore, useConfirmationPopoverHelper, useConsoleHelper, useMenuContext, useMenuContextHelper } from "@/shared";
import { getKConfirmMessage } from "../../utils/kConfirmMessage.constants";
import {
    $getAllVisibleNodeIds,
    $collectAllDescendants,
    $findFolderById,
    $countChildren,
    $removeItemsFromTree,
} from "../../utils/kMenu.utils";
import type { Folder } from "../../types/folder.type";

export const useKMenuDeleteHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentK, setCurrentK } = useKStore();
    const { processTabAfterDelete } = useEditorTabBarHelper();

    const selectedCount    = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;

    // ── Single-item hard delete ────────────────────────────────────────────

    const __deleteItems = async (folder: Folder, isHardDelete: boolean = false) => {
        if (!folder.id) {
            _console.error("Cannot remove folder: missing folder information");
            return;
        }

        let nextFolderIdToSelect: number | null = null;
        if (currentK?.flatData) {
            const allVisibleFolderIds = $getAllVisibleNodeIds(currentK.flatData);
            const currentIndex = allVisibleFolderIds.indexOf(folder.id);
            if (currentIndex !== -1) {
                if (currentIndex < allVisibleFolderIds.length - 1) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex + 1];
                } else if (currentIndex > 0) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex - 1];
                }
            }
        }

        const foldersToDelete = $collectAllDescendants(folder).filter((f) => !!f.id);

        try {
            const result = await KService._deleteWorkspaceItems($user.userToken || "", currentK?.id || 1, {
                nodeIds: foldersToDelete.map((f) => f.id!),
            });

            if (result && result.success) {
                if (currentK) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    setCurrentK({ ...currentK, flatData: $removeItemsFromTree(currentK.flatData, idsToRemove) });
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
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to delete folders: ${errorMessage}`);
            }
        }
    };

    // ── Bulk hard delete ───────────────────────────────────────────────────

    const __bulkDeleteFolders = async (selectedIds: number[], isHardDelete: boolean = false) => {
        if (!currentK?.flatData) return;

        const selectedFolders: Folder[] = [];
        for (const folderId of selectedIds) {
            const folder = $findFolderById(currentK.flatData, folderId);
            if (folder && folder.id >= 0) selectedFolders.push(folder);
        }
        if (selectedFolders.length === 0) return;

        let nextFolderIdToSelect: number | null = null;
        const allVisibleFolderIds = $getAllVisibleNodeIds(currentK.flatData);
        const selectedIndices = selectedIds
            .map((id) => allVisibleFolderIds.indexOf(id))
            .filter((idx) => idx !== -1)
            .sort((a, b) => b - a);

        if (selectedIndices.length > 0) {
            const lastSelectedIndex = selectedIndices[0];
            if (lastSelectedIndex < allVisibleFolderIds.length - 1) {
                nextFolderIdToSelect = allVisibleFolderIds[lastSelectedIndex + 1];
            } else if (selectedIndices[selectedIndices.length - 1] > 0) {
                nextFolderIdToSelect = allVisibleFolderIds[selectedIndices[selectedIndices.length - 1] - 1];
            }
        }

        const uniqueFoldersMap = new Map<number, Folder>();
        for (const folder of selectedFolders) {
            for (const desc of $collectAllDescendants(folder)) {
                if (desc.id) uniqueFoldersMap.set(desc.id, desc);
            }
        }
        const foldersToDelete = Array.from(uniqueFoldersMap.values());

        try {
            const result = await KService._deleteWorkspaceItems($user.userToken || "", currentK?.id || 1, {
                nodeIds: foldersToDelete.map((f) => f.id!),
            });

            if (result && result.message === "Items deleted successfully") {
                if (currentK) {
                    const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                    setCurrentK({ ...currentK, flatData: $removeItemsFromTree(currentK.flatData, idsToRemove) });
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
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to delete folders: ${errorMessage}`);
            }
        }
    };

    // ── Batch soft-delete / restore (new API) ─────────────────────────────

    const __deleteRestore_SelectedItems = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        const selectedIds = ids ?? selectedItemIds;
        if (selectedIds.length === 0) return;
        if (!currentK?.flatData) return;

        try {
            const treeData  = KtreeMiniHelper.buildTreeFromV2Items(currentK.flatData);
            const topLevelIds = KtreeMiniHelper.filterTopLevelParents(selectedIds, treeData);
            if (topLevelIds.length === 0) return;

            const selectedItems: KItemV2[] = [];
            for (const itemId of topLevelIds) {
                const item = currentK.flatData.find((i) => i.id === itemId);
                if (item && item.id > 0) selectedItems.push(item);
            }
            if (selectedItems.length === 0) return;

            const uniqueItemsMap = new Map<number, KItemV2>();
            for (const item of selectedItems) uniqueItemsMap.set(item.id, item);
            const itemsToUpdate = Array.from(uniqueItemsMap.values());

            const batchRequests: KUpsertWorkspaceItemRequest[] = itemsToUpdate.map((item) => ({
                action: type === "soft-delete" ? KItemAction.Delete : KItemAction.Restore,
                id: item.id,
            }));

            const result = await KService._upsertWorkspaceItems($user.userToken ?? "", currentK.id, batchRequests);
            if (!result.success) throw new Error(result.message || "Batch update failed");

            if (type === "soft-delete") {
                const nodeIds = itemsToUpdate.map((item) => item.id);
                if (nodeIds.length > 0) processTabAfterDelete(nodeIds, "node");
            }

            const res = await KService._getWorkspaceTreeV2($user.userToken ?? "", currentK.id);
            if (res && res.success) {
                setCurrentK(res.object as KDTO);
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
                _console.success(`Successfully ${type === "soft-delete" ? "deleted" : "restored"} ${itemsToUpdate.length} item(s)`);
            } else {
                throw new Error("Failed to reload workspace tree");
            }
        } catch (error) {
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to update items: ${errorMessage}`);
            }
        }
    };

    // ── Public: DELETE / HARD DELETE / RESTORE entry point ────────────────

    const dhr_items = (event: any, isHardDelete: boolean = false) => {
        if (!contextData) return;
        const ctxData = contextData as any;

        if (ctxData.tagId < 0) {
            setIsMenuContextOpen(false);
            return;
        }

        setIsMenuContextOpen(false);

        const nativeEvent  = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        const isCurrentlyDeleted = !isHardDelete && ctxData.deletedAt != null;
        const childCount = isMultipleSelected ? 0 : $countChildren(ctxData);
        const entityName = isMultipleSelected ? undefined : ctxData.name;

        let title: string;
        let subtitle: string;
        let confirmText: string;
        let confirmColor: "destructive" | "default";

        if (isCurrentlyDeleted) {
            title       = `Restore "${entityName || "item"}"?`;
            subtitle    = "This item will be restored and visible again.";
            confirmText = "Restore";
            confirmColor = "default";
        } else {
            const confirmMsg = getKConfirmMessage({
                type: isHardDelete ? "hard-delete" : "soft-delete",
                entityType: "folder",
                count: selectedCount,
                isMultiple: isMultipleSelected,
                entityName,
                childCount,
            });
            title       = confirmMsg.title;
            subtitle    = confirmMsg.subtitle ?? '';
            confirmText = isHardDelete ? "Delete Permanently" : "Delete";
            confirmColor = "destructive";
        }

        showConfirmation({
            anchorEl: anchorElement,
            title, subtitle, confirmText,
            cancelText: "Cancel",
            confirmColor,
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => {
                if (isHardDelete) {
                    if (isMultipleSelected) {
                        __bulkDeleteFolders(selectedItemIds, isHardDelete);
                    } else {
                        __deleteItems(ctxData as any, isHardDelete);
                    }
                } else {
                    const isDeleted = ctxData.deletedAt !== null && ctxData.deletedAt !== undefined;
                    const operationType: "soft-delete" | "restore" = isDeleted ? "restore" : "soft-delete";
                    const idsToProcess = isMultipleSelected ? selectedItemIds : [ctxData.id];
                    __deleteRestore_SelectedItems(idsToProcess, operationType);
                }
            },
        });
    };

    return { dhr_items };
};
