// Tags Feature Public Exports

// Components
export { AddFolderDialog } from './AddFolderDialog';
export { WorkspaceTree } from '../Folders/WorkspaceTree';
export { CreateFolderDialog } from './CreateFolderDialog';
export { EditWorkspaceItemDialog } from './EditWorkspaceItemDialog';

// NEW: Use these for workspace folders
export { FolderUIStore, FolderUIStoreProvider, useFolderUIStore } from '@/store/folderUI/FolderUIStore';
export type { FolderUIStoreData } from '@/store/folderUI/FolderUIStore';
export { useFolderUIHelper } from '@/hooks/useFolderUIHelper';

// Legacy compatibility - use store + helper instead

// Hooks - Re-export from centralized hooks/Tags
export { 
    // Modern folder exports
    useFolders,
    useWorkspaceFolderTree,
    useFoldersForAutocomplete,
    // Legacy tag exports (deprecated)
    useTags,
    useWorkspaceTagTree,
    useTagsForAutocomplete
} from '../../hooks/Folders';

// Service
export { hashtagService } from '../../services/hashtagService';