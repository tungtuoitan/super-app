import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { AuthStoreProvider } from '@/store/auth/Auth.store';
import { ExplorerProvider } from '@/store/explorer/Explorer.store';
import { FolderDialogProvider } from '@/store/explorer/FolderDialog.store';
import { ContextMenu } from '@/shared/contexts';
import { ContextMenuStoreProvider } from '@/store/contextMenu/ContextMenu.store';
import { ConfirmationPopoverProvider } from '@/store/confirmationPopover/ConfirmationPopover.store';
import { ConfirmationPopoverContainer } from '@/Components/ConfirmationPopover';
import MainNav from './MainNav/MainNav';
import {DialogProvider, EditorTabProvider} from '@/store/index';
import { EditorToolbarProvider } from '@/store/editor/EditorToolbar.store';
import {NoteUIProvider} from '@/store/note/useNoteUI.store';
import {NoteGridPanelProvider} from '@/store/note/useNoteGridPanel.store';
import { NavProvider } from '@/contexts/NavigationContext';
import { WsListProvider } from '@/store/ws/useWsList.store';
import { WsUIProvider } from '@/store/ws/useWsUI.store';
import { ActivityBarProvider } from '@/store/index'
import { AuthCallbackProvider } from '@/store/index'


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
            <NavProvider>
                <AuthCallbackProvider>
                    <ActivityBarProvider>
                    <SnackbarProvider autoHideDuration={3000}>
                    <DndProvider backend={HTML5Backend}>
                        <AuthStoreProvider>
                            <ExplorerProvider>
                                <FolderDialogProvider>
                                    <WsListProvider>
                                        <WsUIProvider>
                                            <NoteUIProvider>
                                                <NoteGridPanelProvider>
                                                    <EditorTabProvider>
                                                        <EditorToolbarProvider>
                                                            <DialogProvider>
                                                                <ContextMenuStoreProvider>
                                                                    <ConfirmationPopoverProvider>
                                                                    <ContextMenu>
                                                                        <MainNav />
                                                                    </ContextMenu>
                                                                    <ConfirmationPopoverContainer />
                                                                </ConfirmationPopoverProvider>
                                                            </ContextMenuStoreProvider>
                                                        </DialogProvider>
                                                    </EditorToolbarProvider>
                                                </EditorTabProvider>
                                                </NoteGridPanelProvider>
                                            </NoteUIProvider>
                                        </WsUIProvider>
                                    </WsListProvider>
                                </FolderDialogProvider>
                            </ExplorerProvider>
                        </AuthStoreProvider>
                    </DndProvider>
                </SnackbarProvider>
            </ActivityBarProvider>
        </AuthCallbackProvider>
    </NavProvider>
    </BrowserRouter>
    );
}
