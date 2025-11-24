import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { AuthProvider } from '@/contexts/AuthContext';
import { TagUIProvider } from '@/Components/Tags/TagUIContext';
import { EditorTabProvider } from '@/Components/Editor';
import { ContextMenuProvider, useContextMenu } from '@/shared/contexts';
import { useTagUI } from '@/Components/Tags/TagUIContext';
import { useRemoveWorkspaceItem, useWorkspaceTagTree } from '@/Components/Tags/useTags';
import MainNav from './MainNav/MainNav';
import {DialogProvider} from '@/store/index';
import { useCallback } from 'react';
import { Tag } from '@/Components/Tags/tag.types';
import {NoteUIProvider} from '@/Components/Notes/NoteUIContext';

// HARDCODED workspace ID for development
// TODO: Get from context/route when workspace selection is implemented
const CURRENT_WORKSPACE_ID = 1;

/**
 * Context Menu Wrapper that provides tag creation and deletion callbacks
 */
function ContextMenuWrapper() {
    const { openCreateDialog, setSelectedTagIds, setLastSelectedTagId } = useTagUI();
    const removeWorkspaceItemMutation = useRemoveWorkspaceItem();
    const { data: workspaceTree } = useWorkspaceTagTree(CURRENT_WORKSPACE_ID);

    /**
     * Recursively collect all descendant tags (children, grandchildren, etc.)
     * Returns array of all tags in the subtree including the root tag
     */
    const collectAllDescendants = useCallback((tag: Tag): Tag[] => {
        const descendants: Tag[] = [tag];

        if (tag.children && tag.children.length > 0) {
            for (const child of tag.children) {
                descendants.push(...collectAllDescendants(child));
            }
        }

        return descendants;
    }, []);

    /**
     * Get all visible tag IDs in tree order (for VS Code-like navigation)
     */
    const getAllVisibleTagIds = useCallback((tags: Tag[]): number[] => {
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
    }, []);

    const handleDeleteTag = useCallback((tag: Tag) => {
        console.log('🗑️ Removing tag from workspace:', tag.tagId, tag.name, 'itemId:', tag.itemId);

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
    }, [removeWorkspaceItemMutation, collectAllDescendants, getAllVisibleTagIds, workspaceTree, setSelectedTagIds, setLastSelectedTagId]);

    return (
        <ContextMenuProvider onCreateTag={openCreateDialog} onDeleteTag={handleDeleteTag}>
            <AppContent />
        </ContextMenuProvider>
    );
}

/**
 * App Content with global right-click handler
 */
function AppContent() {
    const { showContextMenu } = useContextMenu();

    const handleGlobalRightClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Always disable default context menu
        // Always open context menu - let child components override with their own
        showContextMenu(e, 'default');
    };

    return (
        <div
            className="overflow-hidden h-full w-full m-0 p-0"
            onContextMenu={handleGlobalRightClick} // Global right-click handler
        >
            <MainNav />
        </div>
    );
}

/**
 * Main application layout component.
 *
 * This component serves as the primary layout wrapper for the entire application,
 * providing essential providers and routing functionality. It sets up:
 * - Browser routing for client-side navigation
 * - Snackbar notifications with auto-hide and custom close button
 * - DnD (Drag and Drop) context for react-arborist and react-mosaic-component
 * - Authentication context for user session management
 * - Global context menu system for right-click functionality
 * - Main navigation structure
 *
 * The component ensures the application fills the available space with proper
 * overflow handling to prevent scrolling issues.
 *
 * IMPORTANT: DndProvider MUST be placed here (centralized) to support both
 * react-arborist and react-mosaic-component using the same DnD context.
 *
 * @returns The main layout component with all necessary providers
 */
export function Main() {
    return (
        <BrowserRouter>
            <SnackbarProvider autoHideDuration={3000}>
                <DndProvider backend={HTML5Backend}>
                    <AuthProvider>
                        <TagUIProvider>
                            <NoteUIProvider>
                                <EditorTabProvider>
                                    <DialogProvider>
                                        <ContextMenuWrapper />
                                    </DialogProvider>
                                </EditorTabProvider>
                            </NoteUIProvider>
                        </TagUIProvider>
                    </AuthProvider>
                </DndProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}
