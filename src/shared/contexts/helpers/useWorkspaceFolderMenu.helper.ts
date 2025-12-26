/**
 * Workspace Folder Menu Helper Hook
 * Business logic for folder context menu operations
 * Extracted from useOrchestratorContextMenuHelper for folder-specific logic
 */

import { useExplorerStore } from '@/store/explorer/Explorer.store';
import { useFolderDialogHelper } from '@/hooks/explorer/useFolderDialog.helper';
import { useConfirmationPopoverHelper } from '@/hooks/useConfirmationPopover.helper';
import { constants } from '@/utils/constants';
import type { ItemType } from '@/store/explorer/FolderDialog.store';
import { Folder } from '@/types/folder.types';
import { _deleteWorkspaceItems } from '@/services/workspace.service';
import { storageService } from '@/services/storage.service';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';
import { useSnackbar } from 'notistack';
import {useOrchestratorContextMenuStore} from '@/store/contextMenu/ContextMenu.store';

export const useWorkspaceFolderMenuHelper = () => {
    const { auth } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const {
        contextData,
        setIsContextMenuOpen,
    } = useOrchestratorContextMenuStore();

    const {
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
        currentTree,
        setCurrentTree,
    } = useExplorerStore();

    const { openFolderDialog } = useFolderDialogHelper();

    // Derived state
    const isWorkspaceRoot = contextData && contextData.tagId < 0;
    const selectedCount = selectedFolderIds.length;
    const isMultipleSelected = selectedCount > 1;

    /**
     * Get all visible tag IDs in tree order (for VS Code-like navigation)
     */
    const getAllVisibleTagIds = (items: any[]): number[] => {
        const result: number[] = [];

        function traverse(nodes: any[]) {
            for (const node of nodes) {
                const nodeId = node.id;
                if (nodeId) {
                    result.push(nodeId);
                }
                if (node.children && node.children.length > 0) {
                    traverse(node.children);
                }
            }
        }

        traverse(items);
        return result;
    };

    /**
     * Recursively collect all descendant tags (children, grandchildren, etc.)
     * Returns array of all tags in the subtree including the root tag
     */
    const collectAllDescendants = (folder: Folder): Folder[] => {
        const descendants: Folder[] = [folder];

        if (folder.children && folder.children.length > 0) {
            for (const child of folder.children) {
                descendants.push(...collectAllDescendants(child));
            }
        }

        return descendants;
    };

    /**
     * Handle create item action (folder/note/file)
     */
    const createItem = (itemType: ItemType, parentTag?: any) => {
        setIsContextMenuOpen(false);
        openFolderDialog('create', itemType, null, parentTag);
    };

    /**
     * Handle edit folder action
     */
    const editItem = (itemData: any) => {
        setIsContextMenuOpen(false);

        if (itemData) {
            const itemType: ItemType = itemData.type || constants.workspace.itemTypes.folder;
            openFolderDialog('edit', itemType, itemData, null);
        }
    };

    /**
     * Handle delete single folder
     */
    const handleDeleteFolder = (folder: Folder, isHardDelete: boolean = false) => {
        // Validate folder ID exists
        if (!folder.id) {
            console.error('❌ Cannot remove folder: missing folder ID');
            alert('Cannot remove folder: missing folder information');
            return;
        }

        // VS Code behavior: Find next item to select after deletion
        let nextFolderIdToSelect: number | null = null;
        if (currentTree?.items) {
            const allVisibleFolderIds = getAllVisibleTagIds(currentTree.items);
            const currentIndex = allVisibleFolderIds.indexOf(folder.id);

            if (currentIndex !== -1) {
                // Try to select the next item (below)
                if (currentIndex < allVisibleFolderIds.length - 1) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex + 1];
                }
                // If it's the last item, select the previous one (above)
                else if (currentIndex > 0) {
                    nextFolderIdToSelect = allVisibleFolderIds[currentIndex - 1];
                }
            }
        }

        // Collect all descendants (children, grandchildren, etc.) for cascade deletion
        const allFolders = collectAllDescendants(folder);

        // Filter out folders without ID and warn about them
        const foldersToDelete = allFolders.filter((f) => {
            if (!f.id) {
                console.warn(`⚠️ Skipping folder without ID: ${f.name}`);
                return false;
            }
            return true;
        });

        // Delete all folders using workspace service
        const deleteItems = async () => {
            try {
                const token = auth.userToken;

                // Map items with proper type codes (2=folder, 3=note, 4=file)
                const deleteItems = foldersToDelete.map((f) => {
                    const itemType = (f as any).type;
                    let type: 2 | 3 | 4 = 2; // Default to folder

                    if (itemType === constants.workspace.itemTypes.folder || itemType === constants.workspace.itemTypes.tag) {
                        type = 2;
                    } else if (itemType === constants.workspace.itemTypes.note) {
                        type = 3;
                    } else if (itemType === constants.workspace.itemTypes.file) {
                        type = 4;
                    }

                    return {
                        id: f.id!,
                        type,
                    };
                });

                const result = await _deleteWorkspaceItems(
                    token || '',
                    currentTree?.workspaceId || 1,
                    {
                        items: deleteItems,
                        isHardDelete,
                    }
                );

                if (result && result.message === 'Items deleted successfully') {

                    // Remove folders from tree
                    if (currentTree) {
                        const removeItemsRecursively = (
                            items: any[],
                            idsToRemove: Set<number>
                        ): any[] => {
                            return items
                                .filter((item) => !idsToRemove.has(item.id))
                                .map((item) => ({
                                    ...item,
                                    children: item.children
                                        ? removeItemsRecursively(item.children, idsToRemove)
                                        : [],
                                }));
                        };

                        const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                        const updatedItems = removeItemsRecursively(
                            currentTree.items,
                            idsToRemove
                        );

                        setCurrentTree({
                            ...currentTree,
                            items: updatedItems,
                        });

                        // VS Code behavior: Select next item after deletion
                        if (nextFolderIdToSelect !== null) {
                            setSelectedFolderIds([nextFolderIdToSelect]);
                            setLastSelectedFolderId(nextFolderIdToSelect);
                        } else {
                            // Clear selection if no next item
                            setSelectedFolderIds([]);
                            setLastSelectedFolderId(null);
                        }
                    }

                    const action = isHardDelete ? 'permanently deleted' : 'deleted';
                    alert(`✅ Folder ${action} successfully`);
                } else {
                    throw new Error('Failed to delete folders');
                }
            } catch (error) {
                console.error('❌ Failed to delete folders:', error);
                const errorMessage = await parseApiError(error);
                if (isUnauthorizedError(error)) {
                    enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
                } else {
                    enqueueSnackbar(`Failed to delete folders: ${errorMessage}`, { variant: 'error' });
                }
            }
        };

        deleteItems();
    };

    /**
     * Handle bulk delete for multiple selected folders
     */
    const handleBulkDeleteFolders = (selectedIds: number[], isHardDelete: boolean = false) => {

        if (!currentTree?.items) {
            console.error('❌ Cannot delete: no tree data');
            return;
        }

        // Find all selected folders in the tree
        const findFolderById = (items: any[], folderId: number): Folder | null => {
            for (const item of items) {
                const nodeId = item.id;
                if (nodeId === folderId) {
                    return item;
                }
                if (item.children?.length > 0) {
                    const found = findFolderById(item.children, folderId);
                    if (found) return found;
                }
            }
            return null;
        };

        const selectedFolders: Folder[] = [];
        for (const folderId of selectedIds) {
            const folder = findFolderById(currentTree.items, folderId);
            if (folder) {
                // Check if this is a workspace root node (negative ID)
                if (folder.id < 0) {
                    console.warn('⚠️ Skipping workspace root node:', folder.id);
                    continue;
                }
                selectedFolders.push(folder);
            }
        }

        if (selectedFolders.length === 0) {
            console.warn('⚠️ No valid folders to delete');
            return;
        }

        // VS Code behavior: Find next item to select after deletion
        let nextFolderIdToSelect: number | null = null;
        const allVisibleFolderIds = getAllVisibleTagIds(currentTree.items);

        // Find the highest index among selected folders
        const selectedIndices = selectedIds
            .map((id) => allVisibleFolderIds.indexOf(id))
            .filter((idx) => idx !== -1)
            .sort((a, b) => b - a); // Sort descending

        if (selectedIndices.length > 0) {
            const lastSelectedIndex = selectedIndices[0];

            // Try to select the next item after the last selected item
            if (lastSelectedIndex < allVisibleFolderIds.length - 1) {
                nextFolderIdToSelect = allVisibleFolderIds[lastSelectedIndex + 1];
            }
            // If it's the last item, select the previous one before the first selected
            else if (selectedIndices[selectedIndices.length - 1] > 0) {
                nextFolderIdToSelect =
                    allVisibleFolderIds[selectedIndices[selectedIndices.length - 1] - 1];
            }
        }

        // Collect all descendants for all selected folders
        const allFoldersToDelete: Folder[] = [];
        for (const folder of selectedFolders) {
            const descendants = collectAllDescendants(folder);
            allFoldersToDelete.push(...descendants);
        }

        // Remove duplicates (in case of nested selections)
        const uniqueFoldersMap = new Map<number, Folder>();
        for (const folder of allFoldersToDelete) {
            if (folder.id) {
                uniqueFoldersMap.set(folder.id, folder);
            }
        }
        const foldersToDelete = Array.from(uniqueFoldersMap.values());

        // Bulk delete: removing ${foldersToDelete.length} folders (logging removed)

        // Delete all folders using workspace service
        const deleteItems = async () => {
            try {
                const token = auth.userToken;

                // Map items with proper type codes
                const deleteItems = foldersToDelete.map((f) => {
                    const itemType = (f as any).type;
                    let type: 2 | 3 | 4 = 2;

                    if (itemType === constants.workspace.itemTypes.folder || itemType === constants.workspace.itemTypes.tag) {
                        type = 2;
                    } else if (itemType === constants.workspace.itemTypes.note) {
                        type = 3;
                    } else if (itemType === constants.workspace.itemTypes.file) {
                        type = 4;
                    }

                    return {
                        id: f.id!,
                        type,
                    };
                });

                // Debug log removed: bulk deleting items

                const result = await _deleteWorkspaceItems(
                    token || '',
                    currentTree?.workspaceId || 1,
                    {
                        items: deleteItems,
                        isHardDelete,
                    }
                );

                if (result && result.message === 'Items deleted successfully') {

                    // Remove folders from tree
                    if (currentTree) {
                        const removeItemsRecursively = (
                            items: any[],
                            idsToRemove: Set<number>
                        ): any[] => {
                            return items
                                .filter((item) => !idsToRemove.has(item.id))
                                .map((item) => ({
                                    ...item,
                                    children: item.children
                                        ? removeItemsRecursively(item.children, idsToRemove)
                                        : [],
                                }));
                        };

                        const idsToRemove = new Set(foldersToDelete.map((f) => f.id!));
                        const updatedItems = removeItemsRecursively(
                            currentTree.items,
                            idsToRemove
                        );

                        setCurrentTree({
                            ...currentTree,
                            items: updatedItems,
                        });

                        // VS Code behavior: Select next item after deletion
                        if (nextFolderIdToSelect !== null) {
                            setSelectedFolderIds([nextFolderIdToSelect]);
                            setLastSelectedFolderId(nextFolderIdToSelect);
                        } else {
                            setSelectedFolderIds([]);
                            setLastSelectedFolderId(null);
                        }
                    }

                    const action = isHardDelete ? 'permanently deleted' : 'deleted';
                    alert(`✅ ${foldersToDelete.length} folders ${action} successfully`);
                } else {
                    throw new Error('Failed to bulk delete folders');
                }
            } catch (error) {
                console.error('❌ Failed to bulk delete folders:', error);
                const errorMessage = await parseApiError(error);
                if (isUnauthorizedError(error)) {
                    enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
                } else {
                    enqueueSnackbar(`Failed to delete folders: ${errorMessage}`, { variant: 'error' });
                }
            }
        };

        deleteItems();
    };

    const { showConfirmation } = useConfirmationPopoverHelper();

    /**
     * Wrapper for delete with confirmation popover
     */
    const deleteItems = (event: any, isHardDelete: boolean = false) => {
        if (!contextData) return;

        // Check if this is a workspace root node (negative ID)
        if (contextData.tagId < 0) {
            console.warn('⚠️ Cannot delete workspace root node');
            setIsContextMenuOpen(false);
            return;
        }

        setIsContextMenuOpen(false);

        // Extract anchor element from menu event
        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;

        let message: string;

        if (isHardDelete) {
            // Hard delete warning messages
            if (isMultipleSelected) {
                message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${selectedCount} selected folders and ALL their contents (notes, files, subfolders).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
            } else {
                const countChildren = (tag: any): number => {
                    if (!tag.children || tag.children.length === 0) return 0;
                    return (
                        tag.children.length +
                        tag.children.reduce(
                            (sum: number, child: any) => sum + countChildren(child),
                            0
                        )
                    );
                };

                const childCount = countChildren(contextData);
                message =
                    childCount > 0
                        ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}" and ${childCount} child folder(s) with ALL their contents.\n\n❌ This action CANNOT be undone.\n❌ All notes, files, and subfolders will be LOST FOREVER.`
                        : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}" and ALL its contents.\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
            }
        } else {
            // Soft delete messages
            if (isMultipleSelected) {
                message = `Are you sure you want to delete ${selectedCount} selected folders?\n\nThis action cannot be undone.`;
            } else {
                const countChildren = (tag: any): number => {
                    if (!tag.children || tag.children.length === 0) return 0;
                    return (
                        tag.children.length +
                        tag.children.reduce(
                            (sum: number, child: any) => sum + countChildren(child),
                            0
                        )
                    );
                };

                const childCount = countChildren(contextData);
                message =
                    childCount > 0
                        ? `Are you sure you want to delete "${contextData.name}"?\n\nThis will also delete ${childCount} child folder(s).`
                        : `Are you sure you want to delete "${contextData.name}"?`;
            }
        }

        showConfirmation({
            anchorEl: anchorElement,
            message,
            confirmText: isHardDelete ? 'Delete Permanently' : 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'destructive',
            buttonVariant: 'default',
            zIndex: 20000,
            onConfirm: () => {
                if (isMultipleSelected) {
                    handleBulkDeleteFolders(selectedFolderIds, isHardDelete);
                } else {
                    handleDeleteFolder(contextData, isHardDelete);
                }
            },
        });
    };

    return {
        createItem,
        editItem,
        deleteItems,
    };
};
