/**
 * Tree Status Helper Hook
 * Handles tree status operations: selected items status, deleted status checks
 */

import {useKStore} from "../../store/useK.store";
import {KItemV2} from "../../types/kV2.type";
import { useCallback, useMemo } from "react";

export const useKTreeStatusHelper = () => {
    const { selectedItemIds, currentK } = useKStore();

    const selectedCount = selectedItemIds.length;

    /**
     * Check if item or any of its ancestors is deleted
     * Returns: { hasDeletedAncestor: boolean, isDirectlyDeleted: boolean }
     * - hasDeletedAncestor: true if this item OR any ancestor is deleted
     * - isDirectlyDeleted: true if THIS item is deleted (not inherited from parent)
     */
    const getItemStatus =  
        (item: KItemV2 | null | undefined): { hasDeletedAncestor: boolean; isDirectlyDeleted: boolean } => {
            // Handle null/undefined item
            if (!item) {
                return { hasDeletedAncestor: false, isDirectlyDeleted: false };
            }

            // Check if THIS item is directly deleted (không quan tâm ancestor)
            const isDirectlyDeleted = item.deletedAt !== null && item.deletedAt !== undefined;

            // Check if any ANCESTOR is deleted (không quan tâm bản thân item)
            const flatData = currentK?.flatData;
            if (!flatData) {
                return { hasDeletedAncestor: false, isDirectlyDeleted };
            }

            // Helper: Find item by id
            const findById = (id: number): KItemV2 | undefined => {
                return flatData.find((i: KItemV2) => i.id === id);
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
        }

    /**
     * Get selected items statuses
     * Gom các thuộc tính liên quan đến selectedItems vào 1 object
     */
    const selectedItemStatuses = (() => {
        // 1.isMultiple: Kiểm tra xem có nhiều hơn 1 item được chọn không
        const isMultiple = selectedCount > 1;

        // 2.hasAnyNormalItem: tức deletedAt = null
        const hasAnyNormalItem = (() => {
            if (!isMultiple || !currentK?.flatData) return false;

            return selectedItemIds.some((itemId) => {
                const item = currentK.flatData.find((i: any) => i.id === itemId);
                if (!item) return false;

                const status = getItemStatus(item);
                return !status.hasDeletedAncestor;
            });
        })();

        // 3.hasAnyDeletedItem: Kiểm tra xem có item nào bị deleted (directly deleted hoặc ancestor deleted)
        const hasAnyDeletedItem = (() => {
            if (!currentK?.flatData) return false;

            return selectedItemIds.some((itemId) => {
                const item = currentK.flatData.find((i: any) => i.id === itemId);
                if (!item) return false;

                const status = getItemStatus(item);
                // Item is deleted if: directly deleted OR has deleted ancestor
                return status.isDirectlyDeleted || status.hasDeletedAncestor;
            });
        })();

        // 4.hasDeletedAncestor: Kiểm tra xem có item nào có ancestor bị deleted không
        const hasDeletedAncestor = (() => {
            if (!currentK?.flatData) return false;

            return selectedItemIds.some((itemId) => {
                const item = currentK.flatData.find((i: any) => i.id === itemId);
                if (!item) return false;

                const status = getItemStatus(item);
                // Only check if item has deleted ancestor (không check bản thân item)
                return status.hasDeletedAncestor;
            });
        })();

        return {
            isMultiple,
            hasAnyNormalItem,
            hasAnyDeletedItem,
            hasDeletedAncestor,
        };
    })();
    
    return {
        selectedItemStatuses,
        getItemStatus,
    };
};
