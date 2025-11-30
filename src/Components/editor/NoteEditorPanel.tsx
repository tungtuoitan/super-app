/**
 * Note Editor Panel
 * Reuses NoteDetailDialogContent for editor area tabs
 * Includes toolbar for save/cancel actions
 */

import React from 'react';
import { Save, X, RotateCcw } from 'lucide-react';
import { useSnackbar } from 'notistack';
import type { NoteTab } from '@/types/editor/tab.types';
import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import { _createNote, _updateNote } from '@/services/noteService';
import {Note} from '@/types/note.types';
import {NoteDetailDialogContent} from '@/Components/Notes/dialogs/NoteDetailDialogContent';
import {Badge} from '../ui/badge';
import {useEditorTabHelper} from '@/hooks/useEditorTabHelper';
import {useNoteUIHelper} from '@/hooks/useNoteUIHelper';
import {useNoteUIStore} from '@/store/note/useNoteUIStore';

interface NoteEditorPanelProps {
    tab: NoteTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { selectedNote, hasUnsavedChanges } = useNoteUIStore();
    const { updateSelectedNote, markAsSaved, resetChanges, setSelectedNote } = useNoteUIHelper();
    const { markTabAsChanged, updateTabNote } = useEditorTabHelper();
    
    // TODO: Refactor to use _updateNote and _createNote directly with token
    // const updateNoteMutation = useUpdateNote();
    // const createNoteMutation = useCreateNote();
    const updateNoteMutation: any = null; // Temporarily disabled
    const createNoteMutation: any = null; // Temporarily disabled
    
    const { enqueueSnackbar } = useSnackbar();

    const isCreateMode = selectedNote?.noteId === 0;

    // Sync hasUnsavedChanges with tab state
    React.useEffect(() => {
        markTabAsChanged(tab.id, hasUnsavedChanges);
    }, [hasUnsavedChanges, tab.id, markTabAsChanged]);

    const handleSave = async () => {
        if (!selectedNote) return;

        try {
            let savedNote: Note;
            
            if (isCreateMode) {
                // Create new note - convert Note to CreateNoteDTO
                const createData: import('@/types/note.types').CreateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    tags: selectedNote.tags?.map((tag:any) => tag.tagId),
                    type: selectedNote.type,
                };
                
                console.log('📝 Creating note with data:', createData);
                savedNote = await createNoteMutation.mutateAsync(createData);
                console.log('✅ Note created successfully:', savedNote);
                
                enqueueSnackbar('Note created successfully', { variant: 'success' });
            } else {
                // Update existing note - convert Note to UpdateNoteDTO
                const updateData: import('@/types/note.types').UpdateNoteDTO = {
                    name: selectedNote.name,
                    description: selectedNote.description,
                    tags: selectedNote.tags?.map((tag:any) => tag.tagId),
                    type: selectedNote.type,
                    isArchived: selectedNote.isArchived,
                };
                
                console.log('📝 Updating note with data:', updateData);
                savedNote = await updateNoteMutation.mutateAsync({
                    id: selectedNote.noteId,
                    data: updateData,
                });
                console.log('✅ Note updated successfully:', savedNote);
                
                enqueueSnackbar('Note saved successfully', { variant: 'success' });
            }
            
            // ✅ FIX: Update context with the saved note from server
            console.log('🔄 Setting selectedNote to saved note:', savedNote);
            setSelectedNote(savedNote);
            
            // ✅ FIX: Update tab with the saved note
            if (updateTabNote) {
                console.log('📑 Updating tab with saved note');
                updateTabNote(tab.id, savedNote);
            }
            
            // Mark as saved after all updates
            markAsSaved();
            
        } catch (error) {
            console.error('❌ Failed to save note:', error);
            enqueueSnackbar('Failed to save note', { variant: 'error' });
        }
    };

    const handleCancel = () => {
        resetChanges();
        enqueueSnackbar('Changes discarded', { variant: 'info' });
    };

    const isSaving = updateNoteMutation.isPending || createNoteMutation.isPending;

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
