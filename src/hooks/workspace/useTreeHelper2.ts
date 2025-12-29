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

export const useTreeHelper2 = () => {
    const { selectedFolderIds, setSelectedFolderIds, lastSelectedFolderId, setLastSelectedFolderId } = useWorkspaceStore();

    /**
     * Clear all selections
     */
    const clearSelection = () => {
        setSelectedFolderIds([]);
        setLastSelectedFolderId(null);
    };

    /**
     * Check if a folder is selected
     */
    const isFolderSelected = (folderId: number) => {
        return selectedFolderIds.includes(folderId);
    };

    /**
     * Handle selection change from react-arborist tree
     * Maps node.id (TreeFolder ID) to entity ID (folder/note/file ID)
     */
    const handleSelectionChange = (nodes: NodeApi<TreeFolder>[]) => {
        // Helper to get entity ID from node (V2 structure)
        const getEntityId = (node: NodeApi<TreeFolder>): number | null => {
            const itemData = node.data.data;
            return (itemData as any).entityId;
        };

        const folderIds = nodes
            .map(getEntityId)
            .filter((id): id is number => id !== null && id > 0); // Filter out workspace nodes and null

        setSelectedFolderIds(folderIds);
        if (folderIds.length > 0) {
            setLastSelectedFolderId(folderIds[folderIds.length - 1]);
        }
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

        const currentSelection = selectedFolderIds;
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
                        setSelectedFolderIds(rangeSelection);
                    } else {
                        setSelectedFolderIds([newFolderId]);
                    }
                    setLastSelectedFolderId(newFolderId);
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
                        setSelectedFolderIds(rangeSelection);
                    } else {
                        setSelectedFolderIds([newFolderId]);
                    }
                    setLastSelectedFolderId(newFolderId);
                }
                break;

            case "a":
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Ctrl+A: Select all
                    setSelectedFolderIds(allVisibleFolderIds);
                    setLastSelectedFolderId(allVisibleFolderIds[allVisibleFolderIds.length - 1]);
                }
                break;

            case "Escape":
                // Clear selection
                clearSelection();
                setLastSelectedFolderId(null);
                break;
        }
    }, [selectedFolderIds, setSelectedFolderIds, setLastSelectedFolderId]);

    return {
        isFolderSelected,
        handleSelectionChange,
        handleKeyDown,
    };
};
