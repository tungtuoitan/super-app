/**
 * Tree Operation Helper Hook
 * Handles tree operations: drag & drop, refresh, new folder
 */

import type { TreeFolder } from './tree.helper';
import { getAllFoldersFlattened, isDescendant, findFolderById } from './tree.helper';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useFolderDialogHelper } from './useFolderDialogHelper';
import { useWorkspaceOperation } from './useWorkspaceOperation.helper';
import { _upsertFolder } from '@/services/workspace.service';

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

    /**
     * Handle drag and drop - SUPPORTS MULTI-ITEM DRAG
     */
    const handleMove = async (
        args: { dragIds: string[]; parentId: string | null; index: number },
        treeData: TreeFolder[]
    ) => {
        console.log('🔄 Tree Node Move Event (Multi-Drag):', {
            draggedTagIds: args.dragIds,
            dragCount: args.dragIds.length,
            newParentId: args.parentId || 'root',
            newIndex: args.index,
        });

        try {
            setIsDragging(true);

            let folderIds = args.dragIds.map(id => parseInt(id));

            // VS CODE BEHAVIOR: Filter out descendants of selected nodes
            folderIds = folderIds.filter(folderId => {
                const isDescendantOfOtherSelected = folderIds.some(otherFolderId => {
                    if (otherFolderId === folderId) return false;
                    return isDescendant(folderId, otherFolderId, treeData);
                });
                return !isDescendantOfOtherSelected;
            });

            console.log('📊 Filtered folder IDs (excluding descendants):', {
                original: args.dragIds,
                filtered: folderIds,
                removedCount: args.dragIds.length - folderIds.length
            });

            if (folderIds.length === 0) {
                console.log('⚠️ All selected folders are descendants of other selected folders - nothing to move');
                setIsDragging(false);
                return;
            }

            let newParentId: number | undefined = undefined;
            if (args.parentId) {
                const parsedParentId = parseInt(args.parentId);
                if (parsedParentId < 0) {
                    newParentId = undefined;
                } else {
                    newParentId = parsedParentId;
                }
            }

            // VALIDATION: Prevent invalid moves
            const hasWorkspaceRoot = folderIds.some(id => id < 0);
            if (hasWorkspaceRoot) {
                console.warn('⚠️ Cannot move workspace root node');
                setIsDragging(false);
                return;
            }

            if (newParentId !== undefined && folderIds.includes(newParentId)) {
                console.warn('⚠️ Cannot move items into one of the selected items');
                setIsDragging(false);
                return;
            }

            if (newParentId !== undefined) {
                const isTargetDescendantOfSelected = folderIds.some(draggedId => {
                    return isDescendant(newParentId!, draggedId, treeData);
                });

                if (isTargetDescendantOfSelected) {
                    console.warn('⚠️ Cannot move items into a descendant of selected items');
                    setIsDragging(false);
                    return;
                }
            }

            const targetParentNode = newParentId !== undefined
                ? getAllFoldersFlattened(treeData).find(t => t.data.id === newParentId)
                : null;

            const targetSiblings = targetParentNode
                ? (targetParentNode.children || [])
                : treeData.filter(t => parseInt(t.id) > 0);

            if (args.index >= 0 && args.index <= targetSiblings.length) {
                const itemBefore = args.index > 0 ? targetSiblings[args.index - 1] : null;
                const itemAfter = args.index < targetSiblings.length ? targetSiblings[args.index] : null;

                const itemBeforeId = itemBefore ? parseInt(itemBefore.id) : null;
                const itemAfterId = itemAfter ? parseInt(itemAfter.id) : null;

                const bothInSelection =
                    (itemBeforeId && folderIds.includes(itemBeforeId)) &&
                    (itemAfterId && folderIds.includes(itemAfterId));

                const allOriginalIds = args.dragIds.map(id => parseInt(id));
                const isSameParent = targetSiblings.some(sibling =>
                    allOriginalIds.includes(parseInt(sibling.id))
                );

                if (bothInSelection || (isSameParent && (
                    (itemBeforeId && folderIds.includes(itemBeforeId)) ||
                    (itemAfterId && folderIds.includes(itemAfterId))
                ))) {
                    console.warn('⚠️ Cannot drop between items in the same selection');
                    setIsDragging(false);
                    return;
                }
            }

            // ================================================================
            // API CALL: Update folders with new parent
            // ================================================================
            if (!currentTree?.workspaceId) {
                console.error('❌ No workspace ID found');
                setIsDragging(false);
                return;
            }

            const workspaceId = currentTree.workspaceId;

            console.log('🔄 Calling API to update folders:', {
                workspaceId,
                folderIds,
                newParentId: newParentId ?? null,
            });

            // Update each folder with new parentId
            const updatePromises = folderIds.map(async (folderId) => {
                const folder = getAllFoldersFlattened(treeData).find(t => t.data.id === folderId);
                if (!folder) {
                    console.warn(`⚠️ Folder ${folderId} not found in tree`);
                    return;
                }

                try {
                    const result = await _upsertFolder('', workspaceId, {
                        id: folderId,
                        name: folder.data.name,
                        parentId: newParentId ?? null,
                        color: folder.data.color,
                    });

                    console.log(`✅ Folder ${folderId} updated:`, result);
                    return result;
                } catch (error) {
                    console.error(`❌ Failed to update folder ${folderId}:`, error);
                    throw error;
                }
            });

            // Wait for all updates to complete
            await Promise.all(updatePromises);

            console.log(`✅ Successfully batch moved ${folderIds.length} folder(s)`);

            // Refresh tree to get updated data from backend
            console.log('🔄 Refreshing tree...');
            await loadTree(workspaceId);

            // VS Code behavior: Re-select the moved items after move completes
            setSelectedFolderIds(folderIds);
            if (folderIds.length > 0) {
                setLastSelectedFolderId(folderIds[folderIds.length - 1]);
            }
            console.log(`✅ Re-selected moved item(s): ${folderIds.join(', ')}`);

        } catch (error) {
            console.error('❌ Failed to move folder(s):', error);
            // TODO: Show error toast to user
            // TODO: Revert optimistic UI update
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
            ? findFolderById(folders || [], parentId)
            : undefined;
        
        console.log('📁 Opening dialog with:', {
            parentFolder: parentFolder?.name || 'root',
            parentId,
            foldersCount: folders.length,
        });
            
        openFolderDialog('create', null, parentFolder);
    };

    return {
        handleMove,
        handleNewFolder,
    };
};
