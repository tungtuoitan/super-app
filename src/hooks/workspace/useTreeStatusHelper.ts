/**
 * Tree Status Helper Hook
 * Handles tree status operations: selected items status, deleted status checks
 */

import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { treeMiniHelper } from "./tree.miniHelper";
import { WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { useCallback, useMemo } from "react";

export const useTreeStatusHelper = () => {
    const { selectedItemIds, currentWorkspace } = useWorkspaceStore();

    const selectedCount = selectedItemIds.length;

    /**
     * Check if item or any of its ancestors is deleted
     * Returns: { hasDeletedAncestor: boolean, isDirectlyDeleted: boolean }
     * - hasDeletedAncestor: true if this item OR any ancestor is deleted
     * - isDirectlyDeleted: true if THIS item is deleted (not inherited from parent)
     */
    const getItemStatus = useCallback(
        (item: WorkspaceItemV2 | null | undefined): { hasDeletedAncestor: boolean; isDirectlyDeleted: boolean } => {
            // Handle null/undefined item
            if (!item) {
                return { hasDeletedAncestor: false, isDirectlyDeleted: false };
            }

            // Check if THIS item is directly deleted (không quan tâm ancestor)
            const isDirectlyDeleted = item.deletedAt !== null && item.deletedAt !== undefined;

            // Check if any ANCESTOR is deleted (không quan tâm bản thân item)
            const flatData = currentWorkspace?.flatData;
            if (!flatData) {
                return { hasDeletedAncestor: false, isDirectlyDeleted };
            }

            // Helper: Find item by id
            const findById = (id: number): WorkspaceItemV2 | undefined => {
                return flatData.find((i: WorkspaceItemV2) => i.id === id);
            };

            // Traverse up the parent chain to check if any ancestor is deleted
            let hasDeletedAncestor = false;
            let parentId = item.parentId;
            while (parentId !== null && parentId !== undefined) {
                const parent = findById(parentId);
                if (!parent) break; // Parent not found, stop traversal

                if (parent.deletedAt !== null && parent.deletedAt !== undefined) {
                    // Ancestor is deleted
                    hasDeletedAncestor = true;
                    break;
                }

                parentId = parent.parentId;
            }

            return { hasDeletedAncestor, isDirectlyDeleted };
        },
        [currentWorkspace?.flatData]
    );

    /**
     * Get selected items statuses
     * Gom các thuộc tính liên quan đến selectedItems vào 1 object
     */
    const selectedItemStatuses = useMemo(() => {
        // 1.isMultiple: Kiểm tra xem có nhiều hơn 1 item được chọn không
        const isMultiple = selectedCount > 1;

        // 2.hasAnyActiveItem: Kiểm tra xem có item nào được chọn mà không bị xóa (deleted) không
        const hasAnyActiveItem = (() => {
            if (!isMultiple || !currentWorkspace?.flatData) return false;

            return selectedItemIds.some((workspaceItemId) => {
                const item = currentWorkspace.flatData.find((i: any) => i.id === workspaceItemId);
                if (!item) return false;

                const status = getItemStatus(item);
                return !status.hasDeletedAncestor;
            });
        })();

        return {
            isMultiple,
            hasAnyActiveItem,
        };
    }, [selectedCount, selectedItemIds, currentWorkspace?.flatData, getItemStatus]);

    return {
        selectedItemStatuses,
        getItemStatus,
    };
};
