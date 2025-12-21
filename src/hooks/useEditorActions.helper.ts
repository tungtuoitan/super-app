/**
 * Editor Actions Helper
 * Handles save/create/cancel actions for note editor
 */

import { useSnackbar } from 'notistack';
import { Note, UpsertNoteDTO } from '@/types/note.types';
import { _upsertNote } from '@/services/note.service';
import { _addItemToWorkspace } from '@/services/workspace.service';
import { storageService } from '@/services/storage.service';
import { constants } from '@/utils/constants';
import { useNoteUIHelper } from './useNoteUI.helper';
import { useEditorTabHelper } from './useEditorTab.helper';
import { useNoteGridHelper } from './useNoteGrid.helper';
import { useWorkspaceOperation } from './explorer/useWorkspaceOperation.helper';
import { useNoteUIStore } from '@/store/note/useNoteUI.store';
import { useExplorerStore } from '@/store/explorer/Explorer.store';
import { transformNoteData } from '@/utils/note.utils';

export const useEditorActionsHelper = () => {
    const { selectedNote, noteHasChanges } = useNoteUIStore();
    const { setSelectedNote, markAsSaved, resetChanges } = useNoteUIHelper();
    const { updateTabNote, markTabAsChanged } = useEditorTabHelper();
    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceOperation();
    const { currentTree } = useExplorerStore();
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
                // ✅ Send hashtags for workspace notes, or tags for regular notes
                tags: selectedNote.hashtags && selectedNote.hashtags.length > 0
                    ? selectedNote.hashtags.map((h: any) => typeof h === 'number' ? h : h?.id || h?.tagId) // Extract IDs from hashtags
                    : selectedNote.tags?.map((tag: any) => tag.tagId), // Otherwise use tags
                type: selectedNote.type,
            };

            console.log(`📝 ${isCreateMode ? 'Creating' : 'Updating'} note with data:`, upsertData);
            const savedNote = await _upsertNote(token, upsertData);
            console.log('✅ Note saved successfully:', savedNote);

            if (!savedNote) {
                throw new Error('Failed to save note: No data returned from server');
            }

            // Transform dates from API response strings to Date objects
            const transformedNote = transformNoteData(savedNote);

            // ✅ If creating new note from workspace tree, add to workspace_items
            if (isCreateMode && selectedNote.hashtags && selectedNote.hashtags.length > 0) {
                // Extract folder ID - hashtags can be number[] or Folder[]
                const firstHashtag = selectedNote.hashtags[0];
                const parentFolderId = typeof firstHashtag === 'number'
                    ? firstHashtag
                    : (firstHashtag as any)?.id || (firstHashtag as any)?.tagId;

                const workspaceId = currentTree?.workspaceId;

                if (workspaceId && parentFolderId) {
                    console.log('📤 Adding note to workspace_items:', {
                        workspaceId,
                        parentFolderId,
                        noteId: transformedNote.id
                    });

                    try {
                        await _addItemToWorkspace(token, workspaceId, {
                            parentTagId: parentFolderId,
                            childType: constants.itemTypes.note,
                            childId: transformedNote.id,
                        });
                        console.log('✅ Note added to workspace_items');
                    } catch (error) {
                        console.error('❌ Failed to add note to workspace:', error);
                        // Don't fail the whole save if this fails - note is still created
                    }
                } else {
                    console.warn('⚠️ No workspace ID or parent folder ID found, skipping workspace_items insert');
                }
            }

            enqueueSnackbar(
                isCreateMode ? 'Note created successfully' : 'Note saved successfully',
                { variant: 'success' }
            );

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

            // ✅ Reload workspace tree if note was added to workspace (NO PAGE RELOAD!)
            if (isCreateMode && currentTree?.workspaceId) {
                console.log('🔄 Reloading workspace tree...');
                await loadTree(currentTree.workspaceId);
            }

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
        markTabAsChanged(tabId, noteHasChanges);
    }

    return {
        saveNote,
        cancelChanges,
        syncTabChangeState,
    };
};
