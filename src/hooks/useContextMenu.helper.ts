/**
 * Context Menu Helper Hook
 * Business logic for context menu operations
 * Pattern: Separate business logic from store (similar to useEditorTabHelper)
 */

import { useContextMenuStore, ContextMenuType } from '@/store/contextMenu/ContextMenu.store';
import { useExplorerStore } from '@/store/explorer/Explorer.store';
import { useFolderDialogHelper } from '@/hooks/explorer/useFolderDialog.helper';
import type { ItemType } from '@/store/explorer/FolderDialog.store';
import { useEditorTabHelper } from '@/hooks/vsCode/useEditorTab.helper';
import { Folder } from '@/types/folder.types';
import { _deleteWorkspaceItems, _addItemToWorkspace } from '@/services/workspace.service';
import { _deleteNote } from '@/services/note.service';
import { Note } from '@/types/note.types';
import { useConfirmationPopoverHelper } from '@/hooks/useConfirmationPopover.helper';
import {useEditorTabsStore} from '../store';
import {collectIdsFromTabs, generateTempId, generateUnsavedName} from '../utils';
import { constants } from '@/utils/constants';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';
import { useSnackbar } from 'notistack';



export const useContextMenuHelper = () => {
    const { auth } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const {
        setIsContextMenuOpen,
        setAnchorPoint,
        setContextType,
        setContextData,
        setIsEditDialogOpen,
        setEditItemData,
        contextType,
        contextData,
    } = useContextMenuStore();

    const {
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
        currentTree,
        setCurrentTree
    } = useExplorerStore();
    const { openFolderDialog } = useFolderDialogHelper();
    const { openTab } = useEditorTabHelper();
    const { openTabs } = useEditorTabsStore();

    
    // Get current workspace ID from tree (fallback to 1 if not available)
    const CURRENT_WORKSPACE_ID = currentTree?.workspaceId ?? 1;
    
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
    const getAllVisibleTagIds = (items: any[]): number[] => {
        const result: number[] = [];

        function traverse(nodes: any[]) {
            for (const node of nodes) {
                // ✅ All items have id field in new type system
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
    }







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
            const foldersToDelete = allFolders.filter(f => {
                if (!f.id) {
                    return false;
                }
                return true;
            });
    
            // Delete all folders using workspace service
            const deleteItems = async () => {
                try {
                    const token = auth.userToken;
                    // if (!token) {
                    //     console.error('❌ No authentication token found');
                    //     alert('Authentication required. Please login again.');
                    //     return;
                    // }


                    // Map items with proper type codes (2=folder, 3=note, 4=file)
                    const deleteItems = foldersToDelete.map(f => {
                        // Check if item has 'type' property (WorkspaceItem from tree)
                        const itemType = (f as any).type;
                        let typeCode: 2 | 3 | 4 = 2; // Default to folder
                        
                        if (itemType === constants.workspace.itemTypes.folder || itemType === constants.workspace.itemTypes.tag) {
                            typeCode = 2;
                        } else if (itemType === constants.workspace.itemTypes.note) {
                            typeCode = 3;
                        } else if (itemType === constants.workspace.itemTypes.file) {
                            typeCode = 4;
                        }
                        
                        return { id: f.id!, type: typeCode };
                    });

                    const result = await _deleteWorkspaceItems(token??'', CURRENT_WORKSPACE_ID, {
                        items: deleteItems,
                        cascade: true,
                        isHardDelete: isHardDelete
                    });

                    if (result.success) {

                        // VS Code behavior: Select next item after deletion
                        if (nextFolderIdToSelect !== null) {
                            setSelectedFolderIds([nextFolderIdToSelect]);
                            setLastSelectedFolderId(nextFolderIdToSelect);
                        } else {
                            setSelectedFolderIds([]);
                            setLastSelectedFolderId(null);
                        }

                        // Reload page to refresh tree
                        window.location.reload();
                    } else {
                        alert(`Failed to delete folder: ${result.message}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to delete folders:`, error);
                    const errorMessage = await parseApiError(error);
                    if (isUnauthorizedError(error)) {
                        enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
                    } else {
                        enqueueSnackbar(`Error deleting folder: ${errorMessage}`, { variant: 'error' });
                    }
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
        setIsContextMenuOpen(true);
    }

    /**
     * Handle create item action (folder/note/file)
     * @param itemType - Type of item to create: 'folder', 'note', or 'file'
     * @param parentTag - Parent folder for the new item
     */
    const createItem = (itemType: ItemType, parentTag?: any) => {
        setIsContextMenuOpen(false);
        openFolderDialog('create', itemType, null, parentTag);
    };


    /**
     * Handle add file action
     */
    const handleAddFile = () => {
        setIsContextMenuOpen(false);
        // TODO: Implement add file functionality
    }



    return {
        showContextMenu,
        createItem,
        handleAddFile,
    };
};
