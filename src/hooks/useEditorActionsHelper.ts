/**
 * Editor Actions Helper
 * Handles save/create/cancel actions for note editor
 */

import { useSnackbar } from 'notistack';
import { Note, UpsertNoteDTO } from '@/types/note.types';
import { _upsertNote } from '@/services/note.service';
import { storageService } from '@/services/storage.service';
import { useNoteUIHelper } from './useNoteUIHelper';
import { useEditorTabHelper } from './useEditorTabHelper';
import { useNoteGridHelper } from './useNoteGridHelper';
import { useNoteUIStore } from '@/store/note/useNoteUIStore';
import { transformNoteData } from '@/utils/note.utils';

export const useEditorActionsHelper = () => {
    const { selectedNote, hasUnsavedChanges } = useNoteUIStore();
    const { setSelectedNote, markAsSaved, resetChanges } = useNoteUIHelper();
    const { updateTabNote, markTabAsChanged } = useEditorTabHelper();
    const { loadNotes } = useNoteGridHelper();
    const { enqueueSnackbar } = useSnackbar();

    /**
     * Save current note (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const saveNote = async (tabId?: string): Promise<Note | null> => {
        if (!selectedNote) {
            console.warn('⚠️ No selected note to save');
            return null;
        }

        // Check if it's a new note (id === 0 or negative)
        const isCreateMode = selectedNote.id <= 0;
        const token = storageService.getString('token') || '';

        try {
            // Upsert data - works for both create and update
            const upsertData: UpsertNoteDTO = {
                id: isCreateMode ? 0 : selectedNote.id, // Always use 0 for create
                name: selectedNote.name,
                description: selectedNote.description,
                tags: selectedNote.tags?.map((tag: any) => tag.tagId),
                type: selectedNote.type,
                isArchived: selectedNote.isArchived,
            };

            console.log(`📝 ${isCreateMode ? 'Creating' : 'Updating'} note with data:`, upsertData);
            const savedNote = await _upsertNote(token, upsertData);
            console.log('✅ Note saved successfully:', savedNote);

            if (!savedNote) {
                throw new Error('Failed to save note: No data returned from server');
            }

            enqueueSnackbar(
                isCreateMode ? 'Note created successfully' : 'Note saved successfully',
                { variant: 'success' }
            );

            // Transform dates from API response strings to Date objects
            const transformedNote = transformNoteData(savedNote);

            // Update context with saved note from server
            console.log('🔄 Setting selectedNote to saved note:', transformedNote);
            setSelectedNote(transformedNote);

            // Update tab with saved note if tabId provided
            if (tabId && updateTabNote) {
                console.log('📑 Updating tab with saved note');
                updateTabNote(tabId, transformedNote);
            }

            // Mark as saved after all updates
            markAsSaved();

            // Reload note grid to reflect changes
            console.log('🔄 Reloading note grid...');
            await loadNotes();

            return transformedNote;
        } catch (error) {
            console.error('❌ Failed to save note:', error);
            enqueueSnackbar('Failed to save note', { variant: 'error' });
            return null;
        }
    }

    /**
     * Cancel/discard changes
     */
    const cancelChanges = () => {
        resetChanges();
        enqueueSnackbar('Changes discarded', { variant: 'info' });
    }

    /**
     * Mark tab as changed based on hasUnsavedChanges state
     */
    const syncTabChangeState = (tabId: string) => {
        markTabAsChanged(tabId, hasUnsavedChanges);
    }

    return {
        saveNote,
        cancelChanges,
        syncTabChangeState,
        hasUnsavedChanges,
        selectedNote,
    };
};
