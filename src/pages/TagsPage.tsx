import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { ToolbarContainer } from '@/shared/components/containers/ToolbarContainer';
import { WorkspaceTree } from '../features/tags/components/WorkspaceTree';
import { TagAdd } from '../features/tags/components/toolbars/items/TagAdd';
import { TagSearch } from '../features/tags/components/toolbars/items/TagSearch';
import { TagFilter } from '../features/tags/components/toolbars/items/TagFilter';
import { TagDeleteSelected } from '../features/tags/components/toolbars/items/TagDeleteSelected';
import { Grow } from '@/shared/components/styles/commonStyles';
import { useTagUI } from '../features/tags/store/TagUIContext';
import { useCallback } from 'react';
import { Tag } from '../features/tags/types/tag.types';
import { TagLayoutSelector, TagCreateDialog, AddTagDialog } from '@/features/tags';

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
        <div className="h-full w-full">
            {/* Toolbar with fixed height */}
            <div className="shrink-0">
                <ToolbarContainer>
                    <TagAdd />
                    <Grow />
                    <TagSearch />
                    <TagDeleteSelected />
                    <TagLayoutSelector />
                    <TagFilter />
                </ToolbarContainer>
            </div>

            {/* Tag Tree Container that takes remaining height */}
            <div className="flex-1 mt-5 ml-5 h-[calc(100%-64px-20px)] overflow-auto flex flex-col bg-background">
                {/* <TagTree /> */}
            </div>

            {/* Tag Creation Dialog from Context Menu */}
            <TagCreateDialog
                open={isCreateDialogOpen}
                onClose={closeCreateDialog}
            />
        </div>
    );
}