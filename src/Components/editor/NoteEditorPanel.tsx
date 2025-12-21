/**
 * Note Editor Panel
 * Reuses NoteDetailDialogContent for editor area tabs
 * Includes toolbar for save/cancel actions
 */

import React, {useEffect} from 'react';
import { Save, X, RotateCcw, Undo2 } from 'lucide-react';
import type { EditorTab } from '@/types/editor/tab.types';
import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import {NoteDetailDialogContent} from '@/Components/Notes/dialogs/NoteDetailDialogContent';
import {useEditorActionsHelper} from '@/hooks/useEditorActions.helper';
import {useNoteUIStore} from '@/store/note/useNoteUI.store';
import {useEditorTabsStore} from '@/store/index';
import {_undoDeleteNote} from '@/services/note.service';
import {storageService} from '@/services/storage.service';
import {useSnackbar} from 'notistack';
import {useNoteGridHelper} from '@/hooks/useNoteGrid.helper';

interface NoteEditorPanelProps {
    tab: EditorTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { selectedNote } = useNoteUIStore();
    const { saveNote, cancelChanges, syncTabChangeState, hasUnsavedChanges } = useEditorActionsHelper();
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { loadNotes } = useNoteGridHelper();
    
    const contentRef = React.useRef<HTMLDivElement>(null);

    const [isSaving, setIsSaving] = React.useState(false);
    const [isUndoing, setIsUndoing] = React.useState(false);

    // Sync hasUnsavedChanges with tab state
    useEffect(() => {
        syncTabChangeState(tab.id);
    }, [hasUnsavedChanges, tab.id]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = openTabs.find(t => t.id === tab.id)?.viewState
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab.id]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs(prev => prev.map(t => 
            t.id === tab.id 
                ? { ...t, viewState: { ...t.viewState, scrollTop } }
                : t
        ));
    }

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

    const handleUndo = async () => {
        if (!selectedNote || !tab.isDeleted) return;

        setIsUndoing(true);
        try {
            const token = storageService.getString('token') || '';
            await _undoDeleteNote(token, selectedNote.id);

            // Update tab to remove isDeleted flag
            setOpenTabs(prev => prev.map(t => 
                t.id === tab.id && t.type === 'note'
                    ? { ...t, isDeleted: false }
                    : t
            ));

            // Reload note grid to show restored note
            await loadNotes();

            enqueueSnackbar('Note restored successfully', { variant: 'success' });
        } catch (error) {
            console.error('Failed to restore note:', error);
            enqueueSnackbar('Failed to restore note', { variant: 'error' });
        } finally {
            setIsUndoing(false);
        }
    };

    // Keyboard shortcut: Ctrl+S to save
    useEffect(() => {
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
                                    {selectedNote?.deletedAt ? 'Deleted' : 'Active'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ID: {selectedNote?.id || '0'}
                                </span>
                            </div>
                        </div>
                    </div>

                <TooltipProvider>
                    <div className="flex gap-1">
                        {tab.isDeleted ? (
                            // Show Undo button for deleted notes
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleUndo}
                                            disabled={isUndoing}
                                            className="h-8 w-8 text-green-500 hover:bg-green-500/10 disabled:text-white/20"
                                        >
                                            <Undo2 className="h-[18px] w-[18px]" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Restore Note</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            // Show Save button for normal notes
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
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleCancel}
                                        disabled={!hasUnsavedChanges || tab.isDeleted}
                                        className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:text-white/20"
                                    >
                                        <RotateCcw className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{tab.isDeleted ? 'Cannot edit deleted note' : 'Discard Changes'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>

            {/* Content */}
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-background"
            >
                <NoteDetailDialogContent />
            </div>
        </div>
    );
}
