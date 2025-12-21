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

    /**
     * Load workspaces from API
     */
    const loadWorkspaces = async () => {
        try {
            setIsLoading(true);
            const token = storageService.getString('token');
            const data = await _getWsList(token ?? '', { getAll: true });
            
            // Transform dates from API strings to Date objects
            const transformedData = transformWsData(data);
            setWorkspaces(transformedData);
            setError(null);
        } catch (err) {
            console.error('Failed to load workspaces:', err);
            setError(err as Error);
            enqueueSnackbar('Failed to load workspaces', { variant: 'error' });
        } finally {
            setIsLoading(false);
        }
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
    };

    /**
     * Delete selected workspaces (called from context menu after confirmation)
     */
    const handleDeleteSelected = async (selectedIds: number[], isHardDelete: boolean = false) => {
        if (selectedIds.length === 0) return;

        try {
            const token = storageService.getString('token') || '';
            
            // Send comma-separated IDs to backend
            await _deleteWs(token, selectedIds.join(','), isHardDelete);

            const action = isHardDelete ? 'permanently deleted' : 'deleted';
            enqueueSnackbar(`Successfully ${action} ${selectedIds.length} workspace(s)`, {
                variant: 'success'
            });

            // Mark opened workspace tabs as deleted instead of closing them
            const updatedTabs = openTabs.map((tab: BaseTab) => {
                if (tab.type === constants.tabTypes.workspace && selectedIds.includes((tab as any).workspaceId)) {
                    return { ...tab, isDeleted: true };
                }
                return tab;
            });
            setOpenTabs(updatedTabs);

            // Clear selection and reload workspaces
            setRowSelection({});
            await loadWorkspaces();
        } catch (error) {
            console.error('Failed to delete workspaces:', error);
            enqueueSnackbar('Failed to delete workspaces', { variant: 'error' });
        }
    };

    /**
     * Undo delete (restore) workspaces
     */
    const handleUndoDelete = async (ids: number[]) => {
        if (ids.length === 0) return;

        try {
            const token = storageService.getString('token') || '';
            
            // Send comma-separated IDs to backend
            await _undoDeleteWs(token, ids.join(','));

            enqueueSnackbar(`Successfully restored ${ids.length} workspace(s)`, {
                variant: 'success'
            });

            // Reload workspaces to show restored items
            await loadWorkspaces();
        } catch (error) {
            console.error('Failed to restore workspaces:', error);
            enqueueSnackbar('Failed to restore workspaces', { variant: 'error' });
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
        handleUndoDelete,
        openContextMenu,
        formatDateTime,
    };
};
