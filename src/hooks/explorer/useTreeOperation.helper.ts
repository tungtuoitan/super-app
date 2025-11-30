/**
 * Tree Operation Helper Hook
 * Handles tree operations: drag & drop, refresh, new folder
 */

import type { TreeFolder } from './tree.helper';
import { getAllFoldersFlattened, isDescendant, findFolderById } from './tree.helper';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { useFolderDialogHelper } from './useFolderDialogHelper';

export const useTreeOperation = () => {
    const {
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
        setIsDragging,
        refetchCallback,
    } = useExplorerStore();

    const { openFolderDialog } = useFolderDialogHelper();

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
                ? getAllFoldersFlattened(treeData).find(t => t.data.folderId === newParentId)
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

            console.log(`✅ Successfully batch moved ${folderIds.length} folder(s)`);

            // VS Code behavior: Re-select the moved items after move completes
            setSelectedFolderIds(folderIds);
            if (folderIds.length > 0) {
                setLastSelectedFolderId(folderIds[folderIds.length - 1]);
            }
            console.log(`✅ Re-selected moved item(s): ${folderIds.join(', ')}`);

        } catch (error) {
            console.error('❌ Failed to move folder(s):', error);
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
        console.log('📁 Add Folder clicked');
        
        const parentId = selectedFolderIds.length > 0 
            ? selectedFolderIds[0]
            : undefined;
            
        // Extract folders from treeData
        const folders = getAllFoldersFlattened(treeData).map(t => t.data);
        const parentFolder = parentId 
            ? findFolderById(folders || [], parentId)
            : undefined;
            
        openFolderDialog('create', parentFolder);
        
        console.log('📁 Parent folder for new item:', parentFolder?.name || 'root');
    };

    return {
        handleMove,
        handleNewFolder,
    };
};
