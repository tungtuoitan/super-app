/**
 * Editor Actions Helper
 * Handles save/create/cancel actions for note editor
 */

import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { Note, UpsertNoteDTO } from '@/types/note.types';
import { _upsertNote } from '@/services/note.service';
import { _addItemToWorkspace } from '@/services/workspace.service';
import { storageService } from '@/services/storage.service';
import { constants } from '@/utils/constants';
import { useNoteDetailHelper } from './useNoteDetail.helper';
import { useEditorTabHelper } from './useEditorTab.helper';
import { useNoteGridHelper } from './useNoteGrid.helper';
import { useWorkspaceOperation } from './explorer/useWorkspaceOperation.helper';
import { useNoteDetailStore } from '@/store/note/useNoteDetail.store';
import { useExplorerStore } from '@/store/explorer/Explorer.store';
import { transformNoteData } from '@/utils/note.utils';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';

export const useEditorActionsHelper = () => {
    const { auth } = useAuthStore();
    const { selectedNote, noteHasChanges } = useNoteDetailStore();
    const { setSelectedNote, markAsSaved, resetChanges } = useNoteDetailHelper();
    const { updateTabNote, markTabAsChanged } = useEditorTabHelper();
    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceOperation();
    const { currentTree } = useExplorerStore();
    const { enqueueSnackbar } = useSnackbar();

    /**
     * Save current note (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const saveNote = useCallback(async (tabId?: string): Promise<Note | null> => {
        if (!selectedNote) {
            console.warn('⚠️ No selected note to save');
            return null;
        }

        // Check if it's a new note (id === 0 or negative)
        const isCreateMode = selectedNote.id <= 0;
        const token = auth.userToken;

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

            const result = await _upsertNote(token, upsertData);
            
            // Check API response success
            if (!result.success) {
                throw new Error(result.message || 'Failed to save note');
            }
            
            const savedNote = result.object;

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
                    try {
                        await _addItemToWorkspace(token, workspaceId, {
                            parentTagId: parentFolderId,
                            childType: constants.workspace.itemTypes.note,
                            childId: transformedNote.id,
                        });
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
            setSelectedNote(transformedNote);

            // Update tab with saved note if tabId provided
            if (tabId && updateTabNote) {
                updateTabNote(tabId, transformedNote);
            }

            // Mark as saved after all updates
            markAsSaved();

            // Reload note grid to reflect changes
            await loadNotes();

            // ✅ Reload workspace tree if note was added to workspace (NO PAGE RELOAD!)
            if (isCreateMode && currentTree?.workspaceId) {
                await loadTree(currentTree.workspaceId);
            }

            return transformedNote;
        } catch (error) {
            console.error('❌ Failed to save note:', error);
            const errorMessage = await parseApiError(error);

            // Show specific message for unauthorized
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to save note: ${errorMessage}`, { variant: 'error' });
            }
            return null;
        }
    }, [selectedNote, auth.userToken, setSelectedNote, updateTabNote, markAsSaved, loadNotes, loadTree, currentTree, enqueueSnackbar]);

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
