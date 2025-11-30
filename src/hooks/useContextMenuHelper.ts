/**
 * Context Menu Helper Hook
 * Business logic for context menu operations
 * Pattern: Separate business logic from store (similar to useEditorTabHelper)
 */

import { useContextMenuStore, ContextMenuType } from '@/store/contextMenu/ContextMenuStore';
import { useTagUIStore } from '@/store/tagUI/TagUIStore';
import { useTagUIHelper } from '@/hooks/useTagUIHelper';
import {Tag} from '@/types/tag.types';
import {useRemoveWorkspaceItem, useWorkspaceTagTree} from './Tags/useTags';



export const useContextMenuHelper = () => {
    const {
        setIsOpen,
        setAnchorPoint,
        setContextType,
        setContextData,
        setIsEditDialogOpen,
        setEditItemData,
    } = useContextMenuStore();
    
    const { selectedTagIds } = useTagUIStore();
    const { openCreateDialog } = useTagUIHelper();
    const { setSelectedTagIds, setLastSelectedTagId } = useTagUIStore();
    const removeWorkspaceItemMutation = useRemoveWorkspaceItem();
    const CURRENT_WORKSPACE_ID = 1;
    const { data: workspaceTree } = useWorkspaceTagTree(CURRENT_WORKSPACE_ID);
    
        /**
         * Recursively collect all descendant tags (children, grandchildren, etc.)
         * Returns array of all tags in the subtree including the root tag
         */
        const collectAllDescendants = (tag: Tag): Tag[] => {
            const descendants: Tag[] = [tag];
    
            if (tag.children && tag.children.length > 0) {
                for (const child of tag.children) {
                    descendants.push(...collectAllDescendants(child));
                }
            }
    
            return descendants;
        }
    
        /**
         * Get all visible tag IDs in tree order (for VS Code-like navigation)
         */
        const getAllVisibleTagIds = (tags: Tag[]): number[] => {
            const result: number[] = [];
    
            function traverse(nodes: Tag[]) {
                for (const node of nodes) {
                    result.push(node.tagId);
                    if (node.children && node.children.length > 0) {
                        traverse(node.children);
                    }
                }
            }
    
            traverse(tags);
            return result;
        }
    









        const handleDeleteTag = (tag: Tag) => {
            console.log('🗑️ Removing folder from workspace:', tag.tagId, tag.name, 'itemId:', tag.itemId);
    
            // Validate itemId exists
            if (!tag.itemId) {
                console.error('❌ Cannot remove tag: missing itemId');
                alert('Cannot remove tag: missing workspace item information');
                return;
            }
    
            // VS Code behavior: Find next item to select after deletion
            let nextTagIdToSelect: number | null = null;
            if (workspaceTree?.tags) {
                const allVisibleTagIds = getAllVisibleTagIds(workspaceTree.tags);
                const currentIndex = allVisibleTagIds.indexOf(tag.tagId);
    
                if (currentIndex !== -1) {
                    // Try to select the next item (below)
                    if (currentIndex < allVisibleTagIds.length - 1) {
                        nextTagIdToSelect = allVisibleTagIds[currentIndex + 1];
                    }
                    // If it's the last item, select the previous one (above)
                    else if (currentIndex > 0) {
                        nextTagIdToSelect = allVisibleTagIds[currentIndex - 1];
                    }
                }
            }
    
            // Collect all descendants (children, grandchildren, etc.) for cascade deletion
            const allTags = collectAllDescendants(tag);
            console.log(`🗑️ Cascade delete: removing ${allTags.length} tag(s) (including ${allTags.length - 1} descendants)`);
    
            // Filter out tags without itemId and warn about them
            const tagsToDelete = allTags.filter(t => {
                if (!t.itemId) {
                    console.warn(`⚠️ Skipping tag without itemId: ${t.name} (tagId: ${t.tagId})`);
                    return false;
                }
                return true;
            });
    
            console.log(`🗑️ Deleting ${tagsToDelete.length} workspace items:`,
                tagsToDelete.map(t => ({ name: t.name, itemId: t.itemId }))
            );
    
            // Delete all tags in sequence (parent and all descendants)
            // We delete them one by one to ensure proper cleanup
            let deletedCount = 0;
            const totalCount = tagsToDelete.length;
    
            const deleteNext = (index: number) => {
                if (index >= tagsToDelete.length) {
                    console.log(`✅ Successfully removed ${deletedCount}/${totalCount} tag(s) from workspace`);
    
                    // VS Code behavior: Select next item after deletion completes
                    if (nextTagIdToSelect !== null) {
                        setSelectedTagIds([nextTagIdToSelect]);
                        setLastSelectedTagId(nextTagIdToSelect);
                        console.log(`✅ Selected next item: ${nextTagIdToSelect}`);
                    } else {
                        // Clear selection if no next item
                        setSelectedTagIds([]);
                        setLastSelectedTagId(null);
                    }
    
                    return;
                }
    
                const currentTag = tagsToDelete[index];
                console.log(`🗑️ Deleting ${index + 1}/${totalCount}: ${currentTag.name} (itemId: ${currentTag.itemId})`);
    
                removeWorkspaceItemMutation.mutate({
                    workspaceId: CURRENT_WORKSPACE_ID,
                    itemId: currentTag.itemId!
                }, {
                    onSuccess: () => {
                        deletedCount++;
                        console.log(`✅ Deleted ${currentTag.name} (${deletedCount}/${totalCount})`);
                        // Continue with next tag
                        deleteNext(index + 1);
                    },
                    onError: (error) => {
                        console.error(`❌ Failed to remove tag ${currentTag.name}:`, error);
                        // Continue with next tag even if one fails
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

            if (handleDeleteTag) {
                const selectedCount = selectedTagIds.length;
                const isMultipleSelected = selectedCount > 1;

                if (isMultipleSelected) {
                    // Delete all selected tags
                    console.log('🗑️ Deleting multiple tags:', selectedTagIds);
                    // For now, just delete the right-clicked tag
                    // TODO: Implement bulk delete functionality
                    handleDeleteTag(itemData);
                } else {
                    // Delete single tag
                    handleDeleteTag(itemData);
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
        selectedTagIds,
    };
};
