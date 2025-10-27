/**
 * Notes Page Component
 * Main page for notes management using the new architecture
 */

import { Box } from '@mui/material';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { GridContainer } from '@/shared/components/ui/GridContainer';
import { ToolbarContainer } from '@/shared/components/containers/ToolbarContainer';
import { NoteGrid } from '@/features/notes';
import { NoteDetailDialog } from '@/features/notes/components/dialogs/NoteDetailDialog';
import { NoteCreate } from '@/features/notes/components/toolbars/items/NoteCreate';
import { NoteSearch } from '@/features/notes/components/toolbars/items/NoteSearch';
import { NoteFilter } from '@/features/notes/components/toolbars/items/NoteFilter';
import { NoteDeleteSelected } from '@/features/notes/components/toolbars/items/NoteDeleteSelected';
import { Grow } from '@/shared/components/styles/commonStyles';
import { useNoteUI } from '@/features/notes/store/NoteUIContext';
import { useEditorTabs } from '@/features/editor';
import {useCallback} from 'react';
import { Note } from '@/features/notes/types/note.types';

/**
 * Notes page with proper error boundary
 * This page follows the new architecture patterns:
 * - Uses global NoteUIProvider from Main.tsx for cross-feature sharing
 * - Server state managed by React Query hooks
 * - Wrapped in error boundary for error handling
 */
export function NotesPage() {
    return (
        <ErrorBoundary>
            <NotesPageContent />
        </ErrorBoundary>
    );
}

/**
 * Internal content component with toolbar and grid layout
 * Uses common GridContainer with fixed toolbar height and flexible grid area
 * Performance optimized: Only subscribes to context at this level to pass callbacks
 */
function NotesPageContent() {
    
    // ✅ Open note in editor tab instead of dialog
    const { openNoteTab } = useEditorTabs();

    
    return (
        <div style={{ height: '100%', width: '100%'  }}>
            {/* Toolbar with fixed height */}
            <Box sx={{ flexShrink: 0 }}>
                <ToolbarContainer>
                    <NoteCreate />
                    <Grow />
                    <NoteSearch />
                    <NoteDeleteSelected />
                    <NoteFilter />
                </ToolbarContainer>
            </Box>
            
            {/* Note Grid Container that takes remaining height */}
            <Box sx={{ 
                flex: 1,
                margin: '20px 0 0 20px',
                height: 'calc(100% - 64px - 20px)', // 64px toolbar + 20px margin
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'background.paper',
            }}>
                <NoteGrid onNoteClick={openNoteTab} />
                <NoteDetailDialog />
            </Box>
        </div>
    );
}