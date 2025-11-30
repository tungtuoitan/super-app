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
// Note: Use workspace.service directly instead of deprecated hooks