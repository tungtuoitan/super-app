/**
 * Workspace List Helper
 * Business logic for workspace list operations
 */

import { _deleteWs, _getWsList, _undoDeleteWs, WsDTO } from '@/services/ws.service';
import { storageService } from '@/services/storage.service';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';
import { useSnackbar } from 'notistack';
import { useWsListStore, Ws } from '@/store/ws/useWsList.store';
import { constants } from '@/utils/constants';
import { useWsTabHelper } from './useWsTab.helper';
import { generateTempId, generateUnsavedName, collectIdsFromTabs } from '@/utils/temp-id.utils';
import {BaseTab} from '@/types/editor/tab.types';
import {useEditorTabsStore} from '../store';
import { useAuthStore } from '@/store/auth/Auth.store';
import { parseApiError, isUnauthorizedError } from '@/utils/api-error.utils';
import { useWsUIStore } from '@/store/ws/useWsUI.store';
/**
 * Transform workspace DTOs (dates as strings) to domain models (dates as Date objects)
 */
const transformWsData = (dtos: WsDTO[]): Ws[] => {
    return dtos.map(dto => ({
        id: dto.id,
        name: dto.name,
        description: dto.description,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
        userId: dto.userId,
    }));
};

export const useWsListHelper = () => {
    const { auth } = useAuthStore();
    const {
        workspaces,
        setWorkspaces,
        setIsLoading,
        setError,
        rowSelection,
        setRowSelection,
    } = useWsListStore();

    const { enqueueSnackbar } = useSnackbar();
    const { setIsContextMenuOpen, setAnchorPoint, setContextType, setContextData } = useContextMenuStore();
    const { openWorkspaceTab } = useWsTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { setShouldFocusWsName } = useWsUIStore();

    /**
     * Load workspaces from API
     */
    const loadWorkspaces = async () => {
        try {
            setIsLoading(true);
            const token = auth.userToken;
            const result = await _getWsList(token, { getAll: true });
            
            // Check API response success
            if (!result.success) {
                throw new Error(result.message || 'Failed to load workspaces');
            }
            
            // Transform dates from API strings to Date objects
            const transformedData = transformWsData(result.data || []);
            setWorkspaces(transformedData);
            setError(null);
        } catch (err) {
            console.error('Failed to load workspaces:', err);
            const errorMessage = await parseApiError(err);
            setError(new Error(errorMessage));

            // Show specific message for unauthorized
            if (isUnauthorizedError(err)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to load workspaces: ${errorMessage}`, { variant: 'error' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sync workspace grid changes to open tabs
     * @param action - The action performed on workspaces ('delete', 'restore', etc.)
     * @param workspaceIds - Array of workspace IDs affected
     */
    const syncWsGridToTab = (action: 'delete' | 'restore', workspaceIds: number[]) => {
        if (workspaceIds.length === 0) return;

        //* LOGIC: data trong Tab luôn là data cũ (tức là data mà user đang thao tác), k sync với db, nó chỉ sync những gì user thao tác
        const updatedTabs = openTabs.map((tab: BaseTab) => {
            if (tab.type === constants.vscode.tab.tabTypes.workspace && workspaceIds.includes((tab as any).data.id)) {
                switch (action) {
                    case 'delete':
                        // Mark tab as deleted instead of closing it
                        return { ...tab, isDeleted: true };
                    case 'restore':
                        // Remove deleted flag when restoring
                        return { ...tab, isDeleted: false };
                    default:
                        return tab;
                }
            }
            return tab;
        });

        setOpenTabs(updatedTabs);
        console.log(`🔄 Synced ${action} action for ${workspaceIds.length} workspace(s) to tabs`);
    };

    /**
     * Create new workspace (temporary with negative ID)
     */
    const createNewWorkspace = () => {
        console.log('➕ Creating new workspace...');

        // Generate sequential temporary negative ID from open tabs
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);
        
        // Create temporary workspace
        const newWorkspace: Ws = {
            id: tempId,
            name: name,
            description: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            userId: 0, // Temporary user ID
        };

        // Insert at the beginning of workspaces array
        setWorkspaces([newWorkspace, ...workspaces]);

        // Open workspace in editor tab
        console.log('🏢 Opening new workspace in tab:', newWorkspace);
        openWorkspaceTab(newWorkspace);

        // Focus vào Workspace Name field sau khi tab mở
        setShouldFocusWsName(true);
    };

    /**
     * Delete selected workspaces (called from context menu after confirmation)
     */
    const handleDeleteSelected = async (selectedIds: number[], isHardDelete: boolean = false) => {
        if (selectedIds.length === 0) return;

        try {
            const token = auth.userToken;
            
            // Send comma-separated IDs to backend
            const result = await _deleteWs(token, selectedIds.join(','), isHardDelete);

            // Check API response success
            if (result.success) {
                const action = isHardDelete ? 'permanently deleted' : 'deleted';
                enqueueSnackbar(`Successfully ${action} ${selectedIds.length} workspace(s)`, {
                    variant: 'success'
                });
                // ✅ Chỉ sync tabs khi delete API thành công
                if (selectedIds.length > 0) {
                    syncWsGridToTab('delete', selectedIds);
                }
    
                // Clear selection and reload workspaces
                setRowSelection({});
            }
            else {
                throw new Error(result.message || 'Failed to delete workspace(s)');
            }

            await loadWorkspaces();
        } catch (error) {
            console.error('Failed to delete workspaces:', error);
            const errorMessage = await parseApiError(error);

            // Show specific message for unauthorized
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to delete workspaces: ${errorMessage}`, { variant: 'error' });
            }
        }
    };

    /**
     * Undo delete (restore) workspaces
     */
    const handleUndoDelete = async (ids: number[]) => {
        if (ids.length === 0) return;

        try {
            const token = auth.userToken;
            
            // Send comma-separated IDs to backend
            const result = await _undoDeleteWs(token, ids.join(','));

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || 'Failed to restore workspace(s)');
            }

            enqueueSnackbar(`Successfully restored ${ids.length} workspace(s)`, {
                variant: 'success'
            });

            // Sync workspace grid changes to open tabs (restore)
            syncWsGridToTab('restore', ids);

            // Reload workspaces to show restored items
            await loadWorkspaces();
        } catch (error) {
            console.error('Failed to restore workspaces:', error);
            const errorMessage = await parseApiError(error);

            // Show specific message for unauthorized
            if (isUnauthorizedError(error)) {
                enqueueSnackbar('Unauthorized. Please login again.', { variant: 'error' });
            } else {
                enqueueSnackbar(`Failed to restore workspaces: ${errorMessage}`, { variant: 'error' });
            }
        }
    };

    /**
     * Handle context menu
     */
    const openContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds: number[];
        let selectedWorkspaces: Ws[] = [];

        // If row provided (clicked on a row)
        if (row) {
            const rowId = parseInt(row.id);
            // If row is not selected, add it to current selection
            if (!row.getIsSelected()) {
                // Add this row to existing selection
                setRowSelection({ ...rowSelection, [row.id]: true });
                // Include this row in selectedIds along with existing selection
                selectedIds = [...Object.keys(rowSelection).map(id => parseInt(id)), rowId];
            } else {
                // Row already selected, use current selection
                selectedIds = Object.keys(rowSelection).map(id => parseInt(id));
            }

            selectedWorkspaces = [...workspaces]
                .sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                .filter(ws => selectedIds.includes(ws.id));
        } else {
            // Clicked on empty area
            selectedIds = [];
        }

        console.log('🏢 Context menu - selectedIds:', selectedIds);

        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType('workspace-grid');
        setContextData({
            selectedWorkspaces,
            selectedIds,
            onDelete: (isHardDelete: boolean = false) => handleDeleteSelected(selectedIds, isHardDelete),
            addWorkspace: createNewWorkspace,
            onUndoDelete: handleUndoDelete,
        });
        setIsContextMenuOpen(true);
    };

    /**
     * Helper function to format date/time (short format for grid)
     */
    const formatDateTime = (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    };

    return {
        loadWorkspaces,
        createNewWorkspace,
        handleDeleteSelected,
        syncWsGridToTab,
        handleUndoDelete,
        openContextMenu,
        formatDateTime,
    };
};
