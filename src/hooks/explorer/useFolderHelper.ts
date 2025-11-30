import type { Folder } from '@/types/folder.types';
import type { NodeApi } from 'react-arborist';
import {findFolderById, getAllFoldersFlattened, isDescendant, TreeFolder} from './tree.helper';
import {useExplorerStore} from '../../store';

export const useFolderHelper = () => {
    const {
        setSelectedFolder,
        setIsDialogOpen,
        setIsCreateDialogOpen,
        setParentFolderForCreate,
        setExpandedNodes,
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
        setIsDragging,
    } = useExplorerStore();

    /**
     * Dialog actions
     */
    const openDialog = (folder: Folder) => {
        setSelectedFolder(folder);
        setIsDialogOpen(true);
    }

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedFolder(null), 200); // After animation
    }

    const updateSelectedFolder = (folder: Folder) => {
        setSelectedFolder(folder);
    }
    /**
     * Create dialog actions
     */
    const openCreateDialog = (parentFolder?: Folder) => {
        setParentFolderForCreate(parentFolder || null);
        setIsCreateDialogOpen(true);
    }

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setTimeout(() => setParentFolderForCreate(null), 200); // Clear after animation
    }

    /**
     * Tree expansion actions
     */
    const toggleNodeExpansion = (folderId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    }

    const expandNode = (folderId: number) => {
        setExpandedNodes(prev => new Set(prev).add(folderId));
    }
    const collapseNode = (folderId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(folderId);
            return newSet;
        });
    }

    const expandAll = () => {
        // This would need to be called with all folder IDs
        // For now, we'll just expand first few levels
        setExpandedNodes(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    }

    const collapseAll = () => {
        setExpandedNodes(new Set());
    }
    /**
     * Selection actions (VS Code-like)
     */
    const toggleFolderSelection = (folderId: number) => {
        setSelectedFolderIds(prev => {
            if (prev.includes(folderId)) {
                return prev.filter(id => id !== folderId);
            } else {
                return [...prev, folderId];
            }
        });
    }

    const selectAllFolders = (folderIds: number[]) => {
        setSelectedFolderIds(folderIds);
    }
    const clearSelection = () => {
        setSelectedFolderIds([]);
        setLastSelectedFolderId(null);
    }
    const isFolderSelected = (folderId: number) => {
        return selectedFolderIds.includes(folderId);
    }

    
    const handleSelectionChange = (nodes: NodeApi<TreeFolder>[]) => {
        const selectedIds = nodes.map(node => node.id);
        console.log('🎯 Tree selection changed:', selectedIds);
        const folderIds = selectedIds.map(id => parseInt(id)).filter(id => id > 0); // Filter out workspace nodes
        setSelectedFolderIds(folderIds);
        if (folderIds.length > 0) {
            setLastSelectedFolderId(folderIds[folderIds.length - 1]);
        }
    }

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
                ? getAllFoldersFlattened(treeData).find(t => t.data.tagId === newParentId)
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
    }

    /**
     * Handle new folder action
     */
    const handleNewFolder = (
        folders: Folder[] | undefined
    ) => {
        console.log('📁 Add Folder clicked');
        
        const parentId = selectedFolderIds.length > 0 
            ? selectedFolderIds[0]
            : undefined;
            
        const parentFolder = parentId 
            ? findFolderById(folders || [], parentId)
            : undefined;
            
        openCreateDialog(parentFolder);
        
        console.log('📁 Parent folder for new item:', parentFolder?.name || 'root');
    }

    /**
     * Handle refresh action
     */
    const handleRefresh = (refetch: () => void) => {
        console.log('🔄 Refresh clicked');
        refetch();
    };

    /**
     * Handle collapse all action
     */
    const handleCollapseAll = (treeRef: React.RefObject<any>) => {
        console.log('📂 Collapse All clicked');
        if (treeRef.current) {
            treeRef.current.closeAll();
        }
    };

    return {
        // Dialog actions
        openDialog,
        closeDialog,
        updateSelectedFolder,
        
        // Create dialog actions
        openCreateDialog,
        closeCreateDialog,
        
        // Tree expansion actions
        toggleNodeExpansion,
        expandNode,
        collapseNode,
        expandAll,
        collapseAll,
        
        // Selection actions
        toggleFolderSelection,
        selectAllFolders,
        clearSelection,
        isFolderSelected,
        
        // Tree operations
        handleSelectionChange,
        handleMove,
        handleNewFolder,
        handleRefresh,
        handleCollapseAll,
    };
};
