/**
 * Context Menu Helper Hook
 * Business logic for context menu operations
 * Pattern: Separate business logic from store (similar to useEditorTabHelper)
 */

import { useContextMenuStore, ContextMenuType } from '@/store/contextMenu/ContextMenuStore';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useDialogAction } from '@/hooks/explorer/useDialogAction.helper';
import { Folder } from '@/types/folder.types';
import { _deleteWorkspaceItems } from '@/services/workspace.service';
import { storageService } from '@/services/storage.service';



export const useContextMenuHelper = () => {
    const {
        setIsOpen,
        setAnchorPoint,
        setContextType,
        setContextData,
        setIsEditDialogOpen,
        setEditItemData,
    } = useContextMenuStore();
    
    const { selectedFolderIds } = useExplorerStore();
    const { openCreateDialog } = useDialogAction();
    const { setSelectedFolderIds, setLastSelectedFolderId } = useExplorerStore();
    const CURRENT_WORKSPACE_ID = 1;
    
    // TODO: Get workspaceTree from proper source (workspace service or context)
    const workspaceTree: any = null; // Temporarily disabled
    
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
    
            // Delete all folders using workspace service
            const deleteItems = async () => {
                try {
                    const token = storageService.getString('token');
                    if (!token) throw new Error('No authentication token');

                    console.log(`🗑️ Deleting ${foldersToDelete.length} workspace items:`,
                        foldersToDelete.map(f => ({ name: f.name, itemId: f.itemId }))
                    );

                    await _deleteWorkspaceItems(token, CURRENT_WORKSPACE_ID, {
                        items: foldersToDelete.map(f => ({ itemId: f.itemId! })),
                        cascade: true
                    });

                    console.log(`✅ Successfully removed ${foldersToDelete.length} folder(s) from workspace`);

                    // VS Code behavior: Select next item after deletion
                    if (nextFolderIdToSelect !== null) {
                        setSelectedFolderIds([nextFolderIdToSelect]);
                        setLastSelectedFolderId(nextFolderIdToSelect);
                        console.log(`✅ Selected next item: ${nextFolderIdToSelect}`);
                    } else {
                        setSelectedFolderIds([]);
                        setLastSelectedFolderId(null);
                    }

                    // Reload page or invalidate cache
                    window.location.reload();
                } catch (error) {
                    console.error(`❌ Failed to delete folders:`, error);
                }
            };

            deleteItems();
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
