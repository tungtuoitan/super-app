/**
 * Editor Toolbar Helper
 * Orchestrates toolbar actions for different tab types (Note, Workspace, etc.)
 * Routes to appropriate service helpers based on active tab type
 */

import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import type { BaseTab } from '@/types/editor/tab.types';
import type { Note } from '@/types/note.types';
import { constants } from '@/utils/constants';
import { useEditorDetailHelper } from './useEditorDetail.helper';
import { useEditorTabHelper } from './useEditorTab.helper';
import { useNoteDetailStore } from '@/store/note/useNoteDetail.store';
import { useWsDetailStore } from '@/store/ws/useWsDetail.store';
import { useEditorTabsStore } from '@/store/index';
import { useEditorToolbarStore } from '@/store/editor/EditorToolbar.store';
import { storageService } from '@/services/storage.service';
import { _upsertWsBatch } from '@/services/ws.service';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';
import { useNoteGridHelper } from '../note/useNoteGrid.helper';
import { useWsHelper } from '../ws/useWs.helper';
import { useWsDetailHelper } from '../ws/useWsDetail.helper';
import { Ws } from '@/store/ws/useWs.store';
import { useNoteGridStore } from '@/store/note/useNoteGrid.store';
import {useNoteDetailHelper} from '../note/useNoteDetail.helper';


export const useEditorToolbarHelper = () => {
    const { auth } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { activeTabId } = useEditorTabsStore();
    const { getTabById } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();
    
    // Get active tab
    const activeTab = activeTabId ? getTabById(activeTabId) : null;
    const { setOpenTabs,openTabs} = useEditorTabsStore();
    
    // Note-specific
    const { selectedNote, setSelectedNote } = useNoteGridStore();
    
    const { cancelChanges } = useEditorDetailHelper();
    const { upsertNote } = useNoteDetailHelper();
    
    // Workspace-specific
    const { selectedWorkspace, wsHasChanges, setSelectedWorkspace } = useWsDetailStore();
    const { resetWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsHelper();

    // Get status text based on tab type and deletion state
    const _statusText = (() => {
        if (!activeTab) return 'No Tab';
        
        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            return selectedNote?.deletedAt ? 'InActive' : 'Active';
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            return selectedWorkspace?.deletedAt ? 'InActive' : 'Active';
        }
        
        return 'Active';
    })();

    // Get item ID based on tab type
    const _itemId = (() => {
        if (!activeTab) return null;
        
        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            return selectedNote?.id || null;
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            return selectedWorkspace?.id || null;
        }
        
        return null;
    })();

    // Handle Upsert - orchestrator for all entity types (create/update/soft delete/restore)
    const handleUpsert = useCallback(async () => {
        if (!activeTab) return;

        setIsSaving(true);
        try {
            if (activeTab.type === constants.vscode.tab.tabTypes.note) {
                // Use existing note upsert logic
                await upsertNote(activeTab.id);
            } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
                // Workspace save logic
                if (!selectedWorkspace) return; 

                const token = auth.userToken;
                // Use batch API with single element array
                const result = await _upsertWsBatch(token, [{
                    id: selectedWorkspace.id > 0 ? selectedWorkspace.id : null,
                    name: selectedWorkspace.name,
                    description: selectedWorkspace.description,
                    userId: selectedWorkspace.userId,
                }]);

                // Check API response success
                if (!result.success) {
                    throw new Error(result.message || 'Failed to save workspace');
                }

                // Extract workspace from batch response (Workspaces array)
                const batchResult = result.object as any;
                const savedWorkspace = batchResult?.Workspaces?.[0];

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
                    // Update the active tab with the saved workspace data
                    setOpenTabs((prev: BaseTab[]) => {
                        const updatedTabs = prev.map(t => {
                            // Check if this is the tab we just saved
                            const isCurrentTab = t.id === activeTab.id && t.data.id === activeTab.data.id && t.type === constants.vscode.tab.tabTypes.workspace;

                            if (isCurrentTab) {
                                // Update tab with new workspace data and mark as saved
                                return {
                                    ...t,
                                    data: updatedWorkspace,
                                    title: updatedWorkspace.name,
                                    hasUnsavedChanges: false
                                };
                            }

                            // Return unchanged tab
                            return t;
                        });

                        return updatedTabs;
                    });

                    // Update selectedWorkspace to sync with new data
                    setSelectedWorkspace(updatedWorkspace);

                    // Reload workspace list
                    await loadWorkspaces();

                    enqueueSnackbar('Workspace saved successfully', { variant: 'success' });
                }
            }
        } catch (error) {
            console.error('Failed to save:', error);
            const errorMessage = await parseApiError(error);

            // Show specific message for unauthorized
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to save ${activeTab.type}: ${errorMessage}`, { variant: 'error' });
            }
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, selectedNote, selectedWorkspace, upsertNote, setIsSaving, setOpenTabs, setSelectedWorkspace, loadWorkspaces, enqueueSnackbar, auth.userToken]);

    // Handle Cancel - routes to appropriate reset logic
    const handleCancel = useCallback(() => {
        if (!activeTab) return;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            cancelChanges();
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            resetWorkspace();
        }
    }, [activeTab, cancelChanges, resetWorkspace]);

    return {
        handleUpsert,
        handleCancel,
        isSaving,
        _statusText,
        _itemId,
    };
};
