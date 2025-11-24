/**
 * Notes Page Component
 * Main page for notes management using the new architecture
 */

import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { ToolbarContainer } from '@/shared/components/containers/ToolbarContainer';
import {useEditorTabs} from '@/Components/Editor';
import {NoteCreate} from '@/components/Notes/toolbars/NoteCreate';
import {Grow} from '@/shared/components/styles/commonStyles';
import {NoteSearch} from '@/components/Notes/toolbars/NoteSearch';
import {NoteDeleteSelected} from '@/components/Notes/toolbars/NoteDeleteSelected';
import {NoteFilter} from '@/components/Notes/toolbars/NoteFilter';
import {NoteGrid} from '@/Components/Notes/NoteGrid';
import {NoteDetailDialog} from '@/Components/Notes/dialogs/NoteDetailDialog';

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
        <div className="h-full w-full">
            {/* Toolbar with fixed height */}
            <div className="shrink-0">
                <ToolbarContainer>
                    <NoteCreate />
                    <Grow />
                    <NoteSearch />
                    <NoteDeleteSelected />
                    <NoteFilter />
                </ToolbarContainer>
            </div>

            {/* Note Grid Container that takes remaining height */}
            <div className="flex-1 mt-5 ml-5 h-[calc(100%-64px-20px)] overflow-auto flex flex-col bg-background">
                <NoteGrid onNoteClick={openNoteTab} />
                <NoteDetailDialog />
            </div>
        </div>
    );
}