/**
 * Tree Operation Helper Hook
 * Handles tree operations: drag & drop, refresh, new folder
 */

import type { TreeFolder } from './tree.helper';
import { getAllFoldersFlattened, isDescendant, findFolderById } from './tree.helper';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useFolderDialogHelper } from './useFolderDialogHelper';
import { useWorkspaceOperation } from './useWorkspaceOperation.helper';
import { _moveWorkspaceItems } from '@/services/workspace.service';
import type { MoveItemsRequest } from '@/types/workspace.types';
import { Folder } from '@/types/index';
import { useSnackbar } from 'notistack';
import { WORKSPACE } from '@/utils/constants';

export const useTreeOperation = () => {
    const {
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
        setIsDragging,
        currentTree,
        setCurrentTree,
    } = useExplorerStore();
    
    const { openFolderDialog } = useFolderDialogHelper();
    const { loadTree } = useWorkspaceOperation();
    const { enqueueSnackbar } = useSnackbar();

    /**
     * Handle drag and drop - SUPPORTS MULTI-ITEM DRAG (folders, notes, files)
     */
    const handleMove = async (
        args: { dragIds: string[]; parentId: string | null; index: number },
        treeData: TreeFolder[]
    ) => {
        try {
            setIsDragging(true);

            // =================================================================
            // STEP 1: EXTRACT ENTITY IDS FROM DRAGGED ITEMS
            // =================================================================
            const allItems = getAllFoldersFlattened(treeData);
            let itemIds = args.dragIds
                .map(dragId => {
                    const item = allItems.find(t => t.id === dragId);
                    return item?.data.id;
                })
                .filter((id): id is number => id !== undefined);

            // VS CODE BEHAVIOR: Filter out descendants of selected nodes
            itemIds = itemIds.filter(itemId => {
                const isDescendantOfOtherSelected = itemIds.some(otherItemId => {
                    if (otherItemId === itemId) return false;
                    return isDescendant(itemId, otherItemId, treeData);
                });
                return !isDescendantOfOtherSelected;
            });

            if (itemIds.length === 0) {
                console.log('⚠️ All selected items are descendants of other selected items - nothing to move');
                setIsDragging(false);
                return;
            }

            // =================================================================
            // STEP 2: EXTRACT TARGET PARENT ID
            // =================================================================
            // IMPORTANT: args.parentId can be:
            // 1. A folder ID (when dropping INTO a folder)
            // 2. A note/file ID (when dropping BETWEEN siblings - use their parent instead)
            let newParentId: number | undefined = undefined;
            if (args.parentId) {
                const parentNode = allItems.find(t => t.id === args.parentId);
                if (parentNode) {
                    const parentEntityId = parentNode.data.id;
                    
                    // Negative IDs are workspace root nodes (virtual nodes)
                    if (parentEntityId < 0) {
                        newParentId = undefined; // Move to workspace root
                    } else {
                        const itemData = parentNode.data;
                        
                        // Check if this is a folder or note/file
                        if ('type' in itemData) {
                            if (itemData.type === 'folder') {
                                // Dropping INTO a folder - use folder ID as parent
                                newParentId = parentEntityId;
                            } else {
                                // Dropping BETWEEN siblings (note/file) - use their parent instead
                                newParentId = itemData.parentId ?? undefined;
                            }
                        } else {
                            // Fallback: assume folder
                            newParentId = parentEntityId;
                        }
                    }
                }
            }

            // =================================================================
            // STEP 3: VALIDATION - PREVENT INVALID MOVES
            // =================================================================
            const hasWorkspaceRoot = itemIds.some(id => id === WORKSPACE.ROOT_ID);
            if (hasWorkspaceRoot) {
                console.warn('⚠️ Cannot move workspace root node');
                setIsDragging(false);
                return;
            }
            if (itemIds.some(id => id < 0)) {
                console.warn('⚠️ Cannot move items with invalid IDs');
                setIsDragging(false);
                return;
            }

            if (newParentId !== undefined && itemIds.includes(newParentId)) {
                console.warn('⚠️ Cannot move items into one of the selected items');
                setIsDragging(false);
                return;
            }

            if (newParentId !== undefined) {
                const isTargetDescendantOfSelected = itemIds.some(draggedId => {
                    return isDescendant(newParentId!, draggedId, treeData);
                });

                if (isTargetDescendantOfSelected) {
                    console.warn('⚠️ Cannot move items into a descendant of selected items');
                    setIsDragging(false);
                    return;
                }
            }

            // =================================================================
            // STEP 4: VALIDATE DROP POSITION
            // =================================================================
            const targetParentNode = newParentId !== undefined
                ? getAllFoldersFlattened(treeData).find(t => t.data.id === newParentId)
                : null;

            // Filter out workspace root (negative entity IDs)
            const targetSiblings = targetParentNode
                ? (targetParentNode.children || [])
                : treeData.filter(t => t.data.id > 0);

            if (args.index >= 0 && args.index <= targetSiblings.length) {
                const itemBefore = args.index > 0 ? targetSiblings[args.index - 1] : null;
                const itemAfter = args.index < targetSiblings.length ? targetSiblings[args.index] : null;

                const itemBeforeId = itemBefore?.data.id ?? null;
                const itemAfterId = itemAfter?.data.id ?? null;

                const bothInSelection =
                    (itemBeforeId && itemIds.includes(itemBeforeId)) &&
                    (itemAfterId && itemIds.includes(itemAfterId));

                const isSameParent = targetSiblings.some(sibling => {
                    const siblingEntityId = sibling.data.id;
                    return itemIds.includes(siblingEntityId);
                });

                if (bothInSelection || (isSameParent && (
                    (itemBeforeId && itemIds.includes(itemBeforeId)) ||
                    (itemAfterId && itemIds.includes(itemAfterId))
                ))) {
                    console.warn('⚠️ Cannot drop between items in the same selection');
                    setIsDragging(false);
                    return;
                }
            }

            // =================================================================
            // STEP 5: BUILD MOVE REQUEST & CALL API
            // =================================================================
            // =================================================================
            // STEP 5: BUILD MOVE REQUEST & CALL API
            // =================================================================
            if (!currentTree?.workspaceId) {
                console.error('❌ No workspace ID found');
                setIsDragging(false);
                return;
            }

            const workspaceId = currentTree.workspaceId;

            // Build move request matching backend API format
            // Only include items that passed validation (filtered itemIds)
            const moveRequest: MoveItemsRequest = {
                items: itemIds.map(entityId => {
                    const item = allItems.find(t => t.data.id === entityId);
                    if (!item) {
                        throw new Error(`Item with entity ID ${entityId} not found in tree`);
                    }

                    const itemData = item.data;
                    
                    // Map WorkspaceItem type to backend type codes
                    let typeCode: 2 | 3 | 4;
                    if ('type' in itemData) {
                        if (itemData.type === 'folder') {
                            typeCode = 2;
                        } else if (itemData.type === 'note') {
                            typeCode = 3;
                        } else if (itemData.type === 'file') {
                            typeCode = 4;
                        } else {
                            throw new Error(`Unknown item type: ${(itemData as any).type}`);
                        }
                    } else {
                        throw new Error(`Item ${entityId} missing type property`);
                    }

                    return {
                        type: typeCode,
                        id: entityId, // Use entity ID (folder/note/file ID)
                    };
                }),
                targetParentId: newParentId ?? null,
            };

            try {
                const result = await _moveWorkspaceItems('', workspaceId, moveRequest);
                console.log(`✅ Successfully moved ${moveRequest.items.length} item(s):`, result);
                
                // Show success toast
                enqueueSnackbar(
                    `Successfully moved ${moveRequest.items.length} item(s)`,
                    { variant: 'success' }
                );
            } catch (error) {
                console.error(`❌ Failed to move items:`, error);
                
                // Show error toast with user-friendly message
                enqueueSnackbar(
                    'Failed to move items. Please try again.',
                    { variant: 'error' }
                );
                
                throw error;
            }

            // =================================================================
            // STEP 6: REFRESH TREE & RESTORE SELECTION
            // =================================================================
            await loadTree(workspaceId);

            // VS Code behavior: Re-select the moved items after move completes
            setSelectedFolderIds(itemIds);
            if (itemIds.length > 0) {
                setLastSelectedFolderId(itemIds[itemIds.length - 1]);
            }
        } catch (error) {
            console.error('❌ Failed to move item(s):', error);
            
            // Show error toast to user
            enqueueSnackbar(
                'An error occurred while moving items',
                { variant: 'error' }
            );
        } finally {
            setIsDragging(false);
        }
    };

    /**
     * Handle new folder action
     * Opens create dialog with selected folder as parent
     */
    const handleNewFolder = (
        treeData: TreeFolder[]
    ) => {
        console.log('📁 Add Folder clicked', {
            treeDataLength: treeData.length,
            selectedFolderIds,
        });
        
        const parentId = selectedFolderIds.length > 0 
            ? selectedFolderIds[0]
            : undefined;
            
        // Extract folders from treeData
        const folders = getAllFoldersFlattened(treeData).map(t => t.data);
        const parentFolder = parentId 
            ? findFolderById((folders || []) as unknown as Folder[], parentId)
            : undefined;
        
        console.log('📁 Opening dialog with:', {
            parentFolder: parentFolder?.name || 'root',
            parentId,
            foldersCount: folders.length,
        });
            
        openFolderDialog('create', 'folder', null, parentFolder);
    };

    return {
        handleMove,
        handleNewFolder,
    };
};
