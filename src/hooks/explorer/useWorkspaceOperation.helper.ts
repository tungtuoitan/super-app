/**
 * Workspace Operation Helper Hook
 * Handles loading workspaces and their tree data
 */

import { useExplorerStore } from '@/store/explorer/ExplorerStore';
import { _getAllUserWorkspaces, _getWorkspaceTree } from '@/services/workspace.service';

export const useWorkspaceOperation = () => {
    const {
        allWorkspaces,
        setAllWorkspaces,
        currentTrees,
        setCurrentTrees,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        isLoadingWorkspaces,
        setIsLoadingWorkspaces,
        isLoadingTree,
        setIsLoadingTree,
    } = useExplorerStore();

    /**
     * Load all user workspaces
     * Fetches workspace list and sets the first one as default
     */
    const loadAllWorkspaces = async () => {
        try {
            setIsLoadingWorkspaces(true);
            
            // TODO: Get actual token from auth context
            const token = localStorage.getItem('userToken') || 'dummy-token';
            const data = await _getAllUserWorkspaces(token);
            
            console.log('📦 Loaded workspaces:', data);
            setAllWorkspaces(data);

            // Set default to first workspace if available and none selected
            if (data.length > 0 && !selectedWorkspaceId) {
                const defaultWorkspaceId = data[0].id;
                setSelectedWorkspaceId(defaultWorkspaceId);
                
                // Auto-load tree for default workspace
                await loadTree(defaultWorkspaceId);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Failed to load workspaces:', error);
            throw error;
        } finally {
            setIsLoadingWorkspaces(false);
        }
    };

    /**
     * Load tree data for a specific workspace
     * Caches the tree in currentTrees map
     */
    const loadTree = async (workspaceId: number, forceReload = false) => {
        try {
            // Check cache first (unless forcing reload)
            if (!forceReload && currentTrees.has(workspaceId)) {
                console.log('📋 Using cached tree for workspace:', workspaceId);
                return currentTrees.get(workspaceId);
            }

            setIsLoadingTree(true);
            
            // TODO: Get actual token from auth context
            const token = localStorage.getItem('userToken') || 'dummy-token';
            const treeData = await _getWorkspaceTree(token, workspaceId);
            
            console.log('🌳 Loaded tree for workspace:', workspaceId, treeData);
            
            // Update cache
            setCurrentTrees(prev => {
                const newMap = new Map(prev);
                newMap.set(workspaceId, treeData);
                return newMap;
            });
            
            return treeData;
        } catch (error) {
            console.error('❌ Failed to load tree for workspace:', workspaceId, error);
            throw error;
        } finally {
            setIsLoadingTree(false);
        }
    };

    /**
     * Select a workspace and load its tree
     */
    const selectWorkspace = async (workspaceId: number) => {
        console.log('🎯 Selecting workspace:', workspaceId);
        setSelectedWorkspaceId(workspaceId);
        
        // Load tree if not already cached
        if (!currentTrees.has(workspaceId)) {
            await loadTree(workspaceId);
        }
    };

    /**
     * Reload tree for current workspace
     */
    const reloadCurrentTree = async () => {
        if (selectedWorkspaceId) {
            await loadTree(selectedWorkspaceId, true);
        }
    };

    /**
     * Get tree data for a specific workspace
     */
    const getTreeByWorkspaceId = (workspaceId: number) => {
        return currentTrees.get(workspaceId);
    };

    /**
     * Get currently selected tree
     */
    const getCurrentTree = () => {
        return selectedWorkspaceId ? currentTrees.get(selectedWorkspaceId) : null;
    };

    /**
     * Clear all cached trees
     */
    const clearTreeCache = () => {
        setCurrentTrees(new Map());
    };

    return {
        // State
        allWorkspaces,
        currentTrees,
        selectedWorkspaceId,
        isLoadingWorkspaces,
        isLoadingTree,
        
        // Actions
        loadAllWorkspaces,
        loadTree,
        selectWorkspace,
        reloadCurrentTree,
        getTreeByWorkspaceId,
        getCurrentTree,
        clearTreeCache,
    };
};
