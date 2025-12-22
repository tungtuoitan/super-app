/**
 * Editor Toolbar Helper
 * Orchestrates toolbar actions for different tab types (Note, Workspace, etc.)
 * Routes to appropriate service helpers based on active tab type
 */

import { useState, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import type { BaseTab } from '@/types/editor/tab.types';
import type { Note } from '@/types/note.types';
import { constants } from '@/utils/constants';
import { useEditorActionsHelper } from './useEditorActions.helper';
import { useEditorTabHelper } from './useEditorTab.helper';
import { useNoteUIStore } from '@/store/note/useNoteUI.store';
import { useWsUIStore } from '@/store/ws/useWsUI.store';
import { useEditorTabsStore } from '@/store/index';
import { storageService } from '@/services/storage.service';
import { _undoDeleteNote } from '@/services/note.service';
import { _undoDeleteWs } from '@/services/ws.service';
import { useNoteGridHelper } from './useNoteGrid.helper';
import { useWsListHelper } from './useWsList.helper';
import { useWsUIHelper } from './useWsUI.helper';
import { Ws } from '@/store/ws/useWsList.store';

interface EditorToolbarActions {
    // Actions
    handleSave: () => Promise<void>;
    handleCancel: () => void;
    handleUndo: () => Promise<void>;
    
    // States
    _hasAnyChanges: boolean;
    isSaving: boolean;
    isUndoing: boolean;
    
    // Info
    _statusText: string;
    _itemId: number | null;
}

export const useEditorToolbarHelper = (): EditorToolbarActions => {
    const { enqueueSnackbar } = useSnackbar();
    const { activeTabId } = useEditorTabsStore();
    const { getTabById } = useEditorTabHelper();
    
    // Get active tab
    const tab = activeTabId ? getTabById(activeTabId) : null;
    const { setOpenTabs } = useEditorTabsStore();
    
    // Note-specific
    const { selectedNote, noteHasChanges } = useNoteUIStore();
    
    const { saveNote, cancelChanges } = useEditorActionsHelper();
    const { loadNotes } = useNoteGridHelper();
    
    // Workspace-specific
    const { selectedWorkspace, wsHasChanges } = useWsUIStore();
    const { resetWorkspace } = useWsUIHelper();
    const { loadWorkspaces } = useWsListHelper();
    const { _upsertWs } = require('@/services/ws.service');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);

    // Determine if any entity has unsaved changes based on tab type
    const _hasAnyChanges = tab?.type === constants.tabTypes.note ? noteHasChanges : 
               tab?.type === constants.tabTypes.workspace ? wsHasChanges : 
               false;
    
    // Get status text based on tab type and deletion state
    const _statusText = (() => {
        if (!tab) return 'No Tab';
        
        if (tab.type === constants.tabTypes.note) {
            return selectedNote?.deletedAt ? 'InActive' : 'Active';
        } else if (tab.type === constants.tabTypes.workspace) {
            return selectedWorkspace?.deletedAt ? 'InActive' : 'Active';
        }
        
        return 'Active';
    })();

    // Get item ID based on tab type
    const _itemId = (() => {
        if (!tab) return null;
        
        if (tab.type === constants.tabTypes.note) {
            return selectedNote?.id || null;
        } else if (tab.type === constants.tabTypes.workspace) {
            return selectedWorkspace?.id || null;
        }
        
        return null;
    })();

    // Handle Save - routes to appropriate service
    const handleSave = async () => {
        if (!tab) return;

        setIsSaving(true);
        try {
            if (tab.type === constants.tabTypes.note) {
                // Use existing note save logic
                await saveNote(tab.id);
            } else if (tab.type === constants.tabTypes.workspace) {
                // Workspace save logic
                if (!selectedWorkspace) return;

                const token = storageService.getString('token') || '';
                const savedWorkspace = await _upsertWs(token, {
                    id: selectedWorkspace.id > 0 ? selectedWorkspace.id : null,
                    name: selectedWorkspace.name,
                    description: selectedWorkspace.description,
                    userId: selectedWorkspace.userId,
                });

                if (savedWorkspace) {
                    const updatedWorkspace: Ws = {
                        id: savedWorkspace.id,
                        name: savedWorkspace.name,
                        description: savedWorkspace.description,
                        createdAt: new Date(savedWorkspace.createdAt),
                        updatedAt: savedWorkspace.updatedAt ? new Date(savedWorkspace.updatedAt) : null,
                        deletedAt: savedWorkspace.deletedAt ? new Date(savedWorkspace.deletedAt) : null,
                        userId: savedWorkspace.userId,
                    };

                    // Update tab with saved data
                    setOpenTabs((prev: BaseTab[]) => prev.map(t =>
                        t.id === tab.id && t.type === constants.tabTypes.workspace
                            ? { ...t, data: updatedWorkspace, title: updatedWorkspace.name, hasUnsavedChanges: false }
                            : t
                    ));

                    // Reload workspace list
                    await loadWorkspaces();

                    enqueueSnackbar('Workspace saved successfully', { variant: 'success' });
                }
            }
        } catch (error) {
            console.error('Failed to save:', error);
            enqueueSnackbar(`Failed to save ${tab.type}`, { variant: 'error' });
        } finally {
            setIsSaving(false);
        }
    }

    // Handle Cancel - routes to appropriate reset logic
    const handleCancel = () => {
        if (!tab) return;

        if (tab.type === constants.tabTypes.note) {
            cancelChanges();
        } else if (tab.type === constants.tabTypes.workspace) {
            resetWorkspace();
        }
    }

    // Handle Undo - restore deleted item
    const handleUndo = async () => {
        if (!tab || !tab.isDeleted) return;

        setIsUndoing(true);
        try {
            const token = storageService.getString('token') || '';

            if (tab.type === constants.tabTypes.note && selectedNote) {
                await _undoDeleteNote(token, selectedNote.id);

                // Update tab to remove isDeleted flag
                setOpenTabs((prev: BaseTab[]) => prev.map(t =>
                    t.id === tab.id && t.type === constants.tabTypes.note
                        ? { ...t, isDeleted: false }
                        : t
                ));

                // Reload note grid
                await loadNotes();

                enqueueSnackbar('Note restored successfully', { variant: 'success' });
            } else if (tab.type === constants.tabTypes.workspace && selectedWorkspace) {
                await _undoDeleteWs(token, selectedWorkspace.id);

                // Update tab to remove isDeleted flag
                setOpenTabs((prev: BaseTab[]) => prev.map(t =>
                    t.id === tab.id && t.type === constants.tabTypes.workspace
                        ? { ...t, isDeleted: false }
                        : t
                ));

                // Reload workspace list
                await loadWorkspaces();

                enqueueSnackbar('Workspace restored successfully', { variant: 'success' });
            }
        } catch (error) {
            console.error('Failed to restore:', error);
            enqueueSnackbar(`Failed to restore ${tab.type}`, { variant: 'error' });
        } finally {
            setIsUndoing(false);
        }
    }

    return {
        handleSave,
        handleCancel,
        handleUndo,
        _hasAnyChanges,
        isSaving,
        isUndoing,
        _statusText,
        _itemId,
    };
};
