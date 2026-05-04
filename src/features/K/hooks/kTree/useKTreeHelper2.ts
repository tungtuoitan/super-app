/**
 * Tree Selection Helper Hook
 * Handles folder selection operations (VS Code-like multi-selection)
 *
 * @pattern Functions only - State should be accessed directly from useKStore()
 * @returns {Object} Selection action functions only (no state)
 */

import {useKStore} from "../../store/K.store";

import type { NodeApi } from "react-arborist";
import {SPECIAL_IDS} from "../../utils/temp-id.utils";
import {KTreeNode} from "./Ktree.miniHelper";

export const useKTreeSelectionHelper = () => {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, _treeRef, currentK } = useKStore();
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
    const isNodeSelected = (workspaceItemId: number) => {
        return selectedItemIds.includes(workspaceItemId);
    };

    /**
     * Handle selection change from react-arborist tree
     * Maps node.id to workspace_items.id
     */
    const handleSelectionChange = (nodes: NodeApi<KTreeNode>[]) => {
        // Helper to get workspace_items.id from node (V2 structure)
        const getWorkspaceItemId = (node: NodeApi<KTreeNode>): number | null => {
            const itemData = node.data.data;
            return (itemData as any).id; // workspace_items.id
        };

        const workspaceItemIds = nodes.map(getWorkspaceItemId).filter((id): id is number => id !== null && !SPECIAL_IDS.includes(id)); // Filter out workspace nodes, dragZone

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
    const handleKeyDown = 
        (e: KeyboardEvent, allVisibleFolderIds: number[]) => {
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
                case "A":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();

                        // Ctrl+A behavior:
                        // 1. If has selected items → select all siblings of selected items
                        // 2. If no selected items → select all items in tree

                        const tree = _treeRef?.current;
                        if (!tree) {
                            console.warn("⚠️ Tree ref not available for Ctrl+A");
                            return;
                        }

                        let itemsToSelect: number[] = [];

                        if (selectedItemIds.length > 0 && currentK) {
                            // Get first selected item's parentId
                            const firstSelectedId = selectedItemIds[0];
                            const firstSelectedItem = currentK.flatData.find((item: any) => item.id === firstSelectedId);

                            if (firstSelectedItem) {
                                const targetParentId = firstSelectedItem.parentId ?? null;

                                // Find all visible siblings (items with same parentId)
                                const siblings = allVisibleFolderIds.filter((itemId: number) => {
                                    const item = currentK.flatData.find((i: any) => i.id === itemId);
                                    return item && (item.parentId ?? null) === targetParentId;
                                });

                                if (siblings.length > 0) {
                                    itemsToSelect = siblings;
                                } else {
                                    // Fallback: select all if no siblings found
                                    itemsToSelect = allVisibleFolderIds;
                                }
                            } else {
                                // Fallback: select all if item not found
                                itemsToSelect = allVisibleFolderIds;
                            }
                        } else {
                            // No selection → select all visible items
                            itemsToSelect = allVisibleFolderIds;
                        }

                        // Sync with react-arborist tree (critical for dragIds to work!)
                        tree.deselectAll();

                        // Select all nodes in itemsToSelect using tree API
                        tree.visibleNodes.forEach((visibleNode: any) => {
                            const nodeItemId = (visibleNode.data.data as any).id;
                            if (itemsToSelect.includes(nodeItemId)) {
                                visibleNode.selectMulti();
                            }
                        });

                        // Update last selected for keyboard navigation
                        if (itemsToSelect.length > 0) {
                            setLastSelectedItemId(itemsToSelect[itemsToSelect.length - 1]);
                        }

                        // Store will be updated by tree's onSelect handler automatically
                    }
                    break;

                case "Escape":
                    // Clear selection
                    clearSelection();
                    setLastSelectedItemId(null);
                    break;
            }
        }

    const selectItem = (itemsToSelect: number[]) => {
        const tree = _treeRef?.current;
        if (!tree) {
            console.warn("⚠️ Tree ref not available for selectItem");
            return;
        }
        tree.deselectAll();

        // Select all nodes in itemsToSelect using tree API
        tree.visibleNodes.forEach((visibleNode: any) => {
            const nodeItemId = (visibleNode.data.data as any).id;
            if (itemsToSelect.includes(nodeItemId)) {
                visibleNode.selectMulti();
            }
        });
    };

    return {
        isNodeSelected,
        handleSelectionChange,
        handleKeyDown,
        getVisibleNodeIds,
        clearSelection,
        selectItem,
    };
};
