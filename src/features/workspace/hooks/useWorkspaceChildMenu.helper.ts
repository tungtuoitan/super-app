import { useWorkspaceStore } from "../store/workspace.store";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { useConfirmationPopoverHelper, useMenuContextHelper } from "@/shared";
import { getWorkspaceConfirmMessage } from "../utils/confirmMessage";
import { noteService } from "@/features/note";
import { useAuthStore } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useMenuContext } from "@/shared";
import { workspaceService } from "../service/workspace.service";
import { useWorkspaceLoader } from "./useWorkspace.helper";
import { filterTopLevelParents, buildTreeFromV2Items } from "../utils/workspace.tree.utils";
import type { UpsertWorkspaceItemRequest } from "../types/workspace.types";
import { WorkspaceItemAction } from "../types/workspace.types";
import type { WorkspaceItemV2 } from "@/features/workspace/types/workspace-v2.types";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import { useEditorTabBarHelper } from "@/shell";
import { useConsoleHelper } from "@/shared";

export const useWorkspaceChildMenuHelper = () => {
    const { $user } = useAuthStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const _console = useConsoleHelper();
    const { contextType, contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { selectedItemIds, setSelectedItemIds, setLastSelectedItemId, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();
    const { processTabAfterDelete } = useEditorTabBarHelper();

    const isNote = contextType === workspaceConstants.itemTypes.note;
    const isFile = contextType === workspaceConstants.itemTypes.file;
    const selectedCount = selectedItemIds.length;
    const isMultipleSelected = selectedCount > 1;

    const $findItemById = (items: WorkspaceItemV2[], targetId: number): WorkspaceItemV2 | null =>
        items.find(item => item.id === targetId) || null;

    const __deleteNote = async (noteData: any, isHardDelete: boolean = false) => {
        const noteEntityId = noteData?.entityId ?? noteData?.data?.id;
        if (!noteEntityId) {
            _console.error("Cannot delete note: missing note information");
            return;
        }
        try {
            const token = $user.userToken;
            const result = await noteService.deleteNote(token ?? "", noteEntityId.toString());
            if (result.success) {
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
            }
            loadTree();
        } catch (error) {
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) _console.error("Unauthorized. Please login again.");
            else _console.error(`Error deleting note: ${errorMessage}`);
        }
    };

    const __deleteFile = async (fileData: any, isHardDelete: boolean = false) => {
        const workspaceItemId = fileData?.id;
        if (!workspaceItemId) {
            _console.error("Cannot delete file: missing file information");
            return;
        }
        try {
            const token = $user.userToken;
            const workspaceId = currentWorkspace?.id || 1;
            const result = await workspaceService._deleteWorkspaceItems(token ?? "", workspaceId, {
                items: [{ id: workspaceItemId, type: 4 as const }],
                cascade: true,
                isHardDelete: isHardDelete,
            });
            if (result.success || result.message === "Items deleted successfully") {
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
                loadTree();
            } else {
                _console.error(`Failed to delete file: ${result.message}`);
            }
        } catch (error) {
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) _console.error("Unauthorized. Please login again.");
            else _console.error(`Error deleting file: ${errorMessage}`);
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
                const noteIds = itemsToUpdate.filter((item) => item.entityType === 3).map((item) => item.entityId);
                const fileIds = itemsToUpdate.filter((item) => item.entityType === 4).map((item) => item.entityId);
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

    const deleteItems = (event: any, isHardDelete: boolean = false) => {
        if (!contextData) return;
        setIsMenuContextOpen(false);

        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;
        const entityName = isMultipleSelected ? undefined : (contextData.data?.name || contextData.name || "this item");

        const confirmMsg = getWorkspaceConfirmMessage({
            type: isHardDelete ? "hard-delete" : "soft-delete",
            entityType: isFile ? "file" : "note",
            count: selectedCount,
            isMultiple: isMultipleSelected,
            entityName,
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
                    if (isNote) __deleteNote(contextData, isHardDelete);
                    else if (isFile) __deleteFile(contextData, isHardDelete);
                } else {
                    const isCurrentlyDeleted = contextData.deletedAt !== null && contextData.deletedAt !== undefined;
                    const operationType: "soft-delete" | "restore" = isCurrentlyDeleted ? "restore" : "soft-delete";
                    const idsToProcess = isMultipleSelected ? selectedItemIds : [contextData.id];
                    __deleteRestore_SelectedItems(idsToProcess, operationType);
                }
            },
        });
    };

    const editNote = (noteData: any) => {
        if (!noteData) return;
        // TODO: Implement rename dialog for note
    };

    return { deleteItems, editNote };
};
