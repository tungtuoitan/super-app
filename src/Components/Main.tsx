import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { Box } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { AuthProvider } from '@/contexts/AuthContext';
import { NoteUIProvider } from '@/features/notes';
import { TagUIProvider } from '@/features/tags/store/TagUIContext';
import { ContextMenuProvider, useContextMenu } from '@/shared/contexts';
import { useTagUI } from '@/features/tags/store/TagUIContext';
import { useRemoveWorkspaceItem } from '@/features/tags/hooks/useTags';
import MainNav from './MainNav/MainNav';
import {DialogProvider} from '@/store/index';
import { useCallback } from 'react';
import { Tag } from '@/features/tags/types/tag.types';

// HARDCODED workspace ID for development
// TODO: Get from context/route when workspace selection is implemented
const CURRENT_WORKSPACE_ID = 1;

/**
 * Context Menu Wrapper that provides tag creation and deletion callbacks
 */
function ContextMenuWrapper() {
    const { openCreateDialog } = useTagUI();
    const removeWorkspaceItemMutation = useRemoveWorkspaceItem();

    const handleDeleteTag = useCallback((tag: Tag) => {
        console.log('🗑️ Removing tag from workspace:', tag.tagId, tag.name, 'itemId:', tag.itemId);

        // Validate itemId exists
        if (!tag.itemId) {
            console.error('❌ Cannot remove tag: missing itemId');
            alert('Cannot remove tag: missing workspace item information');
            return;
        }

        removeWorkspaceItemMutation.mutate({
            workspaceId: CURRENT_WORKSPACE_ID,
            itemId: tag.itemId
        }, {
            onSuccess: () => {
                console.log('✅ Tag removed from workspace successfully:', tag.name);
            },
            onError: (error) => {
                console.error('❌ Failed to remove tag from workspace:', error);
                alert(`Failed to remove tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
            },
        });
    }, [removeWorkspaceItemMutation]);

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
        <Box
            sx={{
                overflow: 'hidden',
                height: '100%',
                width: '100%',
                margin: 0,
                padding: 0,
                overflowX: 'hidden',
            }}
            onContextMenu={handleGlobalRightClick} // Global right-click handler
        >
            <MainNav />
        </Box>
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
                                <DialogProvider>
                                    <ContextMenuWrapper />
                                </DialogProvider>
                            </NoteUIProvider>
                        </TagUIProvider>
                    </AuthProvider>
                </DndProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}
