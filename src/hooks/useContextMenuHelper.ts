/**
 * Context Menu Helper Hook
 * Business logic for context menu operations
 * Pattern: Separate business logic from store (similar to useEditorTabHelper)
 */

import { useContextMenuStore, ContextMenuType } from '@/store/contextMenu/ContextMenuStore';
import { useFolderUIStore } from '@/store/folderUI/FolderUIStore';
import { useFolderUIHelper } from '@/hooks/useFolderUIHelper';
import { Folder } from '@/types/folder.types';
import {useRemoveWorkspaceItem, useWorkspaceFolderTree} from './Folders/useFolders';



export const useContextMenuHelper = () => {
    const {
        setIsOpen,
        setAnchorPoint,
        setContextType,
        setContextData,
        setIsEditDialogOpen,
        setEditItemData,
    } = useContextMenuStore();
    
    const { selectedFolderIds } = useFolderUIStore();
    const { openCreateDialog } = useFolderUIHelper();
    const { setSelectedFolderIds, setLastSelectedFolderId } = useFolderUIStore();
    const removeWorkspaceItemMutation = useRemoveWorkspaceItem();
    const CURRENT_WORKSPACE_ID = 1;
    const { data: workspaceTree } = useWorkspaceFolderTree(CURRENT_WORKSPACE_ID);
    
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
        }
    
        /**
         * Get all visible tag IDs in tree order (for VS Code-like navigation)
         */
        const getAllVisibleTagIds = (folders: Folder[]): number[] => {
            const result: number[] = [];
    
            function traverse(nodes: Folder[]) {
                for (const node of nodes) {
                    result.push(node.folderId);
                    if (node.children && node.children.length > 0) {
                        traverse(node.children);
                    }
                }
            }
    
            traverse(folders);
            return result;
        }
    








        const handleDeleteFolder = (folder: Folder) => {
            console.log('🗑️ Removing folder from workspace:', folder.folderId, folder.name, 'itemId:', folder.itemId);
    
            // Validate itemId exists
            if (!folder.itemId) {
                console.error('❌ Cannot remove folder: missing itemId');
                alert('Cannot remove folder: missing workspace item information');
                return;
            }
    
            // VS Code behavior: Find next item to select after deletion
            let nextFolderIdToSelect: number | null = null;
            if (workspaceTree?.tags) {
                const allVisibleFolderIds = getAllVisibleTagIds(workspaceTree.tags);
                const currentIndex = allVisibleFolderIds.indexOf(folder.folderId);
    
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
            console.log(`🗑️ Cascade delete: removing ${allFolders.length} folder(s) (including ${allFolders.length - 1} descendants)`);
    
            // Filter out folders without itemId and warn about them
            const foldersToDelete = allFolders.filter(f => {
                if (!f.itemId) {
                    console.warn(`⚠️ Skipping folder without itemId: ${f.name} (folderId: ${f.folderId})`);
                    return false;
                }
                return true;
            });
    
            console.log(`🗑️ Deleting ${foldersToDelete.length} workspace items:`,
                foldersToDelete.map(f => ({ name: f.name, itemId: f.itemId }))
            );
    
            // Delete all folders in sequence (parent and all descendants)
            // We delete them one by one to ensure proper cleanup
            let deletedCount = 0;
            const totalCount = foldersToDelete.length;
    
            const deleteNext = (index: number) => {
                if (index >= foldersToDelete.length) {
                    console.log(`✅ Successfully removed ${deletedCount}/${totalCount} folder(s) from workspace`);
    
                    // VS Code behavior: Select next item after deletion completes
                    if (nextFolderIdToSelect !== null) {
                        setSelectedFolderIds([nextFolderIdToSelect]);
                        setLastSelectedFolderId(nextFolderIdToSelect);
                        console.log(`✅ Selected next item: ${nextFolderIdToSelect}`);
                    } else {
                        // Clear selection if no next item
                        setSelectedFolderIds([]);
                        setLastSelectedFolderId(null);
                    }
    
                    return;
                }
    
                const currentFolder = foldersToDelete[index];
                console.log(`🗑️ Deleting ${index + 1}/${totalCount}: ${currentFolder.name} (itemId: ${currentFolder.itemId})`);
    
                removeWorkspaceItemMutation.mutate({
                    workspaceId: CURRENT_WORKSPACE_ID,
                    itemId: currentFolder.itemId!
                }, {
                    onSuccess: () => {
                        deletedCount++;
                        console.log(`✅ Deleted ${currentFolder.name} (${deletedCount}/${totalCount})`);
                        // Continue with next folder
                        deleteNext(index + 1);
                    },
                    onError: (error) => {
                        console.error(`❌ Failed to remove folder ${currentFolder.name}:`, error);
                        // Continue with next folder even if one fails
                        deleteNext(index + 1);
                    },
                });
            };
    
            // Start cascade deletion
            deleteNext(0);
        }

    /**
     * Show context menu at mouse position
     */
    const showContextMenu = (
        event: React.MouseEvent, 
        type: ContextMenuType = 'default', 
        data?: any
    ) => {
        event.preventDefault();
        event.stopPropagation();
        
        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType(type);
        setContextData(data || null);
        setIsOpen(true);
    }

    /**
     * Close context menu
     */
    const closeContextMenu = () => {
        setIsOpen(false);
    }

    /**
     * Handle create folder action
     */
    const handleCreateTag = (parentTag?: any) => {
        console.log('📁 Context Menu: Add folder clicked for parent:', parentTag);
        closeContextMenu();
        if (openCreateDialog) {
            openCreateDialog(parentTag); 
        }
    };

    /**
     * Handle edit item action
     */
    const handleEditItem = (itemData: any) => {
        console.log('✏️ Context Menu: Edit item clicked', itemData);
        closeContextMenu();
        
        if (itemData) {
            setEditItemData(itemData);
            setIsEditDialogOpen(true);
        }
    };

    /**
     * Handle add file action
     */
    const handleAddFile = () => {
        console.log('📄 Context Menu: Add file clicked');
        closeContextMenu();
        // TODO: Implement add file functionality
    }

    /**
     * Handle add note action
     */
    const handleAddNote = () => {
        console.log('📝 Context Menu: Add note clicked');
        closeContextMenu();
        // TODO: Implement add note functionality
    }

    /**
     * Handle delete item action
     */
    const handleDeleteItem = (itemData: any, contextType: ContextMenuType) => {
        console.log('🗑️ Context Menu: Delete item clicked for:', itemData);

        if (contextType === 'tag' && itemData) {
            // Check if this is a workspace root node (negative ID)
            if (itemData.tagId < 0) {
                console.warn('⚠️ Cannot delete workspace root node');
                closeContextMenu();
                return;
            }

            closeContextMenu();

            if (handleDeleteFolder) {
                const selectedCount = selectedFolderIds.length;
                const isMultipleSelected = selectedCount > 1;

                if (isMultipleSelected) {
                    // Delete all selected folders
                    console.log('🗑️ Deleting multiple folders:', selectedFolderIds);
                    // For now, just delete the right-clicked folder
                    // TODO: Implement bulk delete functionality
                    handleDeleteFolder(itemData);
                } else {
                    // Delete single folder
                    handleDeleteFolder(itemData);
                }
            }
        } else {
            closeContextMenu();
        }
    }

    /**
     * Handle view info action
     */
    const handleViewInfo = () => {
        console.log('ℹ️ Context Menu: View info clicked');
        closeContextMenu();
        // TODO: Implement view info functionality
    }

    /**
     * Close edit dialog
     */
    const closeEditDialog = () => {
        setIsEditDialogOpen(false);
        setTimeout(() => setEditItemData(null), 200);
    }

    return {
        showContextMenu,
        closeContextMenu,
        handleCreateTag,
        handleEditItem,
        handleAddFile,
        handleAddNote,
        handleDeleteItem,
        handleViewInfo,
        closeEditDialog,
        selectedFolderIds,
    };
};
