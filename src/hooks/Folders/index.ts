/**
 * Folders Hooks - Public API
 * Central export point for all folder-related hooks
 * 
 * Note: Backend uses "tag" terminology, frontend uses "folder"
 * Legacy tag exports maintained for backward compatibility
 */

// ========================================
// PRIMARY EXPORTS (Use these)
// ========================================

// Folder queries and mutations
export { 
    // Modern folder exports
    useFolders,
    useFolder,
    useWorkspaceFolderTree,
    useFoldersByDepth,
    useRootFolders,
    useCreateFolder,
    useUpdateFolder,
    useDeleteFolder,
    useArchiveFolder,
    useUnarchiveFolder,
    useMoveFolder,
    useBatchMoveFolder,
    useRemoveWorkspaceItem,
    folderKeys,
} from './useFolders';

// Folder autocomplete
export { 
    useFoldersForAutocomplete,
} from './useFoldersForAutocomplete';

// Workspace tree mutations (adding/updating folders in workspace)
export { 
    useAddItemToWorkspace,
    useAddExistingFolderToWorkspace,
    useCreateAndAddFolderToWorkspace,
    useUpdateWorkspaceItem,
    // Legacy exports (deprecated)
    useAddExistingTagToWorkspace,
    useCreateAndAddTagToWorkspace
} from './useWorkspaceTree';
