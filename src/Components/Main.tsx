import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { AuthStoreProvider } from '@/store/auth/AuthStore';
import { TagUIStoreProvider } from '@/store/tagUI/TagUIStore';
import { EditorTabProvider } from '@/Components/Editor';
import { ContextMenu } from '@/shared/contexts';
import { ContextMenuStoreProvider } from '@/store/contextMenu/ContextMenuStore';
import { useContextMenuHelper } from '@/hooks/useContextMenuHelper';
import { useTagUIStore } from '@/store/tagUI/TagUIStore';
import { useTagUIHelper } from '@/hooks/useTagUIHelper';
import { useRemoveWorkspaceItem, useWorkspaceTagTree } from '@/hooks/Tags/useTags';
import MainNav from './MainNav/MainNav';
import {DialogProvider} from '@/store/index';
import { useCallback } from 'react';
import { Folder as Tag } from '@/types/folder.types';
import {NoteUIProvider} from '@/store/note/useNoteUIStore';


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
                    <AuthStoreProvider>
                        <TagUIStoreProvider>
                            <NoteUIProvider>
                                <EditorTabProvider>
                                    <DialogProvider>
                                        <ContextMenuStoreProvider>
                                            <ContextMenu>
                                                <MainNav />
                                            </ContextMenu>
                                        </ContextMenuStoreProvider>
                                    </DialogProvider>
                                </EditorTabProvider>
                            </NoteUIProvider>
                        </TagUIStoreProvider>
                    </AuthStoreProvider>
                </DndProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}
