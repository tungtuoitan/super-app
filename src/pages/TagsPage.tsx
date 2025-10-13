import { Box } from '@mui/material';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { ToolbarContainer } from '@/shared/components/containers/ToolbarContainer';
import { TagTree } from '../features/tags/components/TagTree';
import { TagCreate } from '../features/tags/components/toolbars/items/TagCreate';
import { TagSearch } from '../features/tags/components/toolbars/items/TagSearch';
import { TagFilter } from '../features/tags/components/toolbars/items/TagFilter';
import { TagDeleteSelected } from '../features/tags/components/toolbars/items/TagDeleteSelected';
import { Grow } from '@/shared/components/styles/commonStyles';
import { useTagUI } from '../features/tags/store/TagUIContext';
import { useCallback } from 'react';
import { Tag } from '../features/tags/types/tag.types';
import { TagLayoutSelector, TagCreateDialog } from '@/features/tags';

/**
 * Tags page with proper error boundary
 * This page follows the same architecture patterns as NotesPage:
 * - Uses global TagUIProvider from Main.tsx for cross-feature sharing
 * - Server state managed by React Query hooks
 * - Wrapped in error boundary for error handling
 */
export function TagsPage() {
    return (
        <ErrorBoundary>
            <TagsPageContent />
        </ErrorBoundary>
    );
}

/**
 * Internal content component with toolbar and tree layout
 * Uses common ToolbarContainer with fixed toolbar height and flexible tree area
 * Performance optimized: Only subscribes to context at this level to pass openDialog prop
 */
function TagsPageContent() {
    
    // ✅ Get dialog state from context 
    const { openDialog, isCreateDialogOpen, closeCreateDialog } = useTagUI();

    
    return (
        <div style={{ height: '100%', width: '100%'  }}>
            {/* Toolbar with fixed height */}
            <Box sx={{ flexShrink: 0 }}>
                <ToolbarContainer>
                    <TagCreate />
                    <Grow />
                    <TagSearch />
                    <TagDeleteSelected />
                    <TagLayoutSelector />
                    <TagFilter />
                </ToolbarContainer>
            </Box>
            
            {/* Tag Tree Container that takes remaining height */}
            <Box sx={{ 
                flex: 1,
                margin: '20px 0 0 20px',
                height: 'calc(100% - 64px - 20px)', // 64px toolbar + 20px margin
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'background.paper',
            }}>
                <TagTree />
            </Box>

            {/* Tag Creation Dialog from Context Menu */}
            <TagCreateDialog
                open={isCreateDialogOpen}
                onClose={closeCreateDialog}
            />
        </div>
    );
}