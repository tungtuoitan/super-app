/**
 * Note Editor Panel
 * Reuses NoteDetailDialogContent for editor area tabs
 * Includes toolbar for save/cancel actions
 */

import React from 'react';
import { Save, X, RotateCcw } from 'lucide-react';
import type { NoteTab } from '@/types/editor/tab.types';
import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import {NoteDetailDialogContent} from '@/Components/Notes/dialogs/NoteDetailDialogContent';
import {useEditorActionsHelper} from '@/hooks/useEditorActionsHelper';
import {useNoteUIStore} from '@/store/note/useNoteUIStore';

interface NoteEditorPanelProps {
    tab: NoteTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { selectedNote } = useNoteUIStore();
    const { saveNote, cancelChanges, syncTabChangeState, hasUnsavedChanges } = useEditorActionsHelper();

    const isCreateMode = selectedNote?.noteId === 0;
    const [isSaving, setIsSaving] = React.useState(false);

    // Sync hasUnsavedChanges with tab state
    React.useEffect(() => {
        syncTabChangeState(tab.id);
    }, [hasUnsavedChanges, tab.id, syncTabChangeState]);

    const handleSave = async () => {
        if (!selectedNote) return;

        setIsSaving(true);
        try {
            await saveNote(tab.id);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        cancelChanges();
    };

    // Keyboard shortcut: Ctrl+S to save
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && !isSaving) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, isSaving, selectedNote]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Toolbar */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 bg-[rgb(37,37,38)] gap-2">
                    <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {selectedNote?.isArchived ? 'Archived' : 'Active'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ID: {selectedNote?.noteId || '0'}
                                </span>
                            </div>
                        </div>
                    </div>

                <TooltipProvider>
                    <div className="flex gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleSave}
                                        disabled={!hasUnsavedChanges || isSaving}
                                        className={`h-8 w-8 ${
                                            hasUnsavedChanges 
                                                ? 'text-[#4FC3F7] hover:bg-[#4FC3F7]/10' 
                                                : 'text-white/40'
                                        } disabled:text-white/20`}
                                    >
                                        <Save className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Save (Ctrl+S)</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleCancel}
                                        disabled={!hasUnsavedChanges}
                                        className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:text-white/20"
                                    >
                                        <RotateCcw className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Discard Changes</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                <NoteDetailDialogContent />
            </div>
        </div>
    );
}
