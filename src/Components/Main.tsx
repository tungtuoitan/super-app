import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { Box } from '@mui/material';

import { AuthProvider } from '@/contexts/AuthContext';
import { NoteUIProvider } from '@/features/notes';
import { TagUIProvider } from '@/features/tags/store/TagUIContext';
import { ContextMenuProvider, useContextMenu } from '@/shared/contexts';
import { useTagUI } from '@/features/tags/store/TagUIContext';
import MainNav from './MainNav/MainNav';
import {DialogProvider} from '@/store/index';

/**
 * Context Menu Wrapper that provides tag creation callback
 */
function ContextMenuWrapper() {
    const { openCreateDialog } = useTagUI();
    
    return (
        <ContextMenuProvider onCreateTag={openCreateDialog}>
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
 * - Authentication context for user session management
 * - Global context menu system for right-click functionality
 * - Main navigation structure
 * 
 * The component ensures the application fills the available space with proper
 * overflow handling to prevent scrolling issues.
 * 
 * @returns The main layout component with all necessary providers
 */
export function Main() {
    return (
        <BrowserRouter>
            <SnackbarProvider autoHideDuration={3000}>
                <AuthProvider>
                    <TagUIProvider>
                        <NoteUIProvider>
                            <DialogProvider>
                                <ContextMenuWrapper />
                            </DialogProvider>
                        </NoteUIProvider>
                    </TagUIProvider>
                </AuthProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}
