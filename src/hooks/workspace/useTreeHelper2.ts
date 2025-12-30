/**
 * Tree Selection Helper Hook
 * Handles folder selection operations (VS Code-like multi-selection)
 *
 * @pattern Functions only - State should be accessed directly from useWorkspaceStore()
 * @returns {Object} Selection action functions only (no state)
 */

import { useCallback } from "react";
import type { NodeApi } from "react-arborist";
import type { TreeFolder } from "./tree.miniHelper";
import { treeMiniHelper } from "./tree.miniHelper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { SPECIAL_IDS } from "@/utils/temp-id.utils";

export const useTreeHelper2 = () => {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, _treeRef } = useWorkspaceStore();

    /**
     * Clear all selections
     */
    const clearSelection = () => {
        setSelectedItemIds([]);
        setLastSelectedItemId(null);
    };

    /**
     * Check if an item is selected (folder/note/file)
     * @param workspaceItemId - workspace_items.id (unique ID for this workspace item)
     */
    const isFolderSelected = (workspaceItemId: number) => {
        return selectedItemIds.includes(workspaceItemId);
    };

    /**
     * Handle selection change from react-arborist tree
     * Maps node.id to workspace_items.id
     */
    const handleSelectionChange = (nodes: NodeApi<TreeFolder>[]) => {
        // Helper to get workspace_items.id from node (V2 structure)
        const getWorkspaceItemId = (node: NodeApi<TreeFolder>): number | null => {
            const itemData = node.data.data;
            return (itemData as any).id; // workspace_items.id
        };

        const workspaceItemIds = nodes
            .map(getWorkspaceItemId)
            .filter((id): id is number => id !== null && !SPECIAL_IDS.includes(id)); // Filter out workspace nodes, dragZone

        setSelectedItemIds(workspaceItemIds);
        if (workspaceItemIds.length > 0) {
            setLastSelectedItemId(workspaceItemIds[workspaceItemIds.length - 1]);
        }
    };

    /**
     * Get all visible node IDs from tree (ONLY actually visible/expanded nodes)
     * Uses react-arborist tree ref to get accurate visible nodes
     * Returns workspace_items.id in display order
     */
    const getVisibleNodeIds = (): number[] => {
        const tree = _treeRef?.current;
        if (!tree || !tree.visibleNodes) {
            return [];
        }

        return tree.visibleNodes
            .map((node: any) => {
                const itemData = node.data.data;
                return (itemData as any).id; // workspace_items.id
            })
            .filter((id: number) => id !== null && id !== undefined && !SPECIAL_IDS.includes(id));
    };

    /**
     * Handle keyboard navigation (VS Code-like)
     * Supports: Arrow Up/Down, Shift+Arrow for range selection, Ctrl+A, Escape
     *
     * ⚡ Performance optimized with useCallback
     */
    const handleKeyDown = useCallback((e: KeyboardEvent, allVisibleFolderIds: number[]) => {
        if (e.target !== document.body && !(e.target as Element).closest("[data-workspace-tree]")) {
            return; // Only handle when tree is focused
        }

        const currentSelection = selectedItemIds;
        const lastSelected = currentSelection.length > 0 ? currentSelection[currentSelection.length - 1] : null;
        const currentIndex = lastSelected ? allVisibleFolderIds.indexOf(lastSelected) : -1;

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                if (currentIndex > 0) {
                    const newFolderId = allVisibleFolderIds[currentIndex - 1];
                    if (e.shiftKey && currentSelection.length > 0) {
                        // Extend selection upward
                        const firstSelected = currentSelection[0];
                        const firstIndex = allVisibleFolderIds.indexOf(firstSelected);
                        const startIndex = Math.min(firstIndex, currentIndex - 1);
                        const endIndex = Math.max(firstIndex, currentIndex - 1);
                        const rangeSelection = allVisibleFolderIds.slice(startIndex, endIndex + 1);
                        setSelectedItemIds(rangeSelection);
                    } else {
                        setSelectedItemIds([newFolderId]);
                    }
                    setLastSelectedItemId(newFolderId);
                }
                break;

            case "ArrowDown":
                e.preventDefault();
                if (currentIndex < allVisibleFolderIds.length - 1) {
                    const newFolderId = allVisibleFolderIds[currentIndex + 1];
                    if (e.shiftKey && currentSelection.length > 0) {
                        // Extend selection downward
                        const firstSelected = currentSelection[0];
                        const firstIndex = allVisibleFolderIds.indexOf(firstSelected);
                        const startIndex = Math.min(firstIndex, currentIndex + 1);
                        const endIndex = Math.max(firstIndex, currentIndex + 1);
                        const rangeSelection = allVisibleFolderIds.slice(startIndex, endIndex + 1);
                        setSelectedItemIds(rangeSelection);
                    } else {
                        setSelectedItemIds([newFolderId]);
                    }
                    setLastSelectedItemId(newFolderId);
                }
                break;

            case "a":
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Ctrl+A: Select all
                    setSelectedItemIds(allVisibleFolderIds);
                    setLastSelectedItemId(allVisibleFolderIds[allVisibleFolderIds.length - 1]);
                }
                break;

            case "Escape":
                // Clear selection
                clearSelection();
                setLastSelectedItemId(null);
                break;
        }
    }, [selectedItemIds, setSelectedItemIds, setLastSelectedItemId]);

    return {
        isFolderSelected,
        handleSelectionChange,
        handleKeyDown,
        getVisibleNodeIds,
    };
};
