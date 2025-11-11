/**
 * Note Detail Dialog Component
 * Main dialog container for note details with fullscreen layout
 * Migrated to ClickUp theme with shadcn/ui components
 */

import React from 'react';
import { Dialog, DialogContent } from '@/Components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { useNoteUI } from '../../store/NoteUIContext';
import { NoteContentToolbar } from './NoteContentToolbar';
import { NoteDetailDialogContent } from './NoteDetailDialogContent';



/**
 * Note Detail Dialog - Fullscreen dialog for note management
 * Uses the same UI structure as RFDDetailDialog
 */
export function NoteDetailDialog() {
    const { selectedNote, isDialogOpen, closeDialog } = useNoteUI();
    const [loading, setLoading] = React.useState(false);

    if (!selectedNote) {
        return null;
    }

    const isCreateMode = selectedNote.noteId === 0;

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none flex flex-col">
                {/* Dialog Header */}
                <header className="flex-shrink-0 bg-card border-b border-border shadow-sm">
                    <div className="flex items-center justify-between h-16 px-6">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-foreground leading-tight">
                                {isCreateMode ? 'Create New Note' : `${selectedNote.name || 'Untitled Note'}`}
                            </h2>
                            {!isCreateMode && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Created: {selectedNote.createdAt.toLocaleDateString()}
                                    {selectedNote.createdBy && ` • Created by: ${selectedNote.createdBy}`}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={closeDialog}
                            className="p-2 hover:bg-editor-hover rounded-md transition-colors"
                            aria-label="close"
                        >
                            <X className="w-5 h-5 text-foreground" />
                        </button>
                    </div>
                </header>

                {/* Toolbar Section */}
                <NoteContentToolbar />

                {/* Loading Backdrop */}
                {loading && (
                    <div className="absolute inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}

                {/* Dialog Content */}
                <div className="flex-1 overflow-hidden bg-background">
                    {/* {selectedNote && <NoteDetailDialogContent />}xxx */}
                </div>
            </DialogContent>
        </Dialog>
    );
}