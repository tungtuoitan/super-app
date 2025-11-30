// Tags Feature Public Exports

// Components
export { AddFolderDialog } from './AddFolderDialog';
export { WorkspaceTree } from '../Folders/WorkspaceTree';
export { CreateFolderDialog } from './CreateFolderDialog';
export { EditWorkspaceItemDialog } from './EditWorkspaceItemDialog';

// NEW: Use these for workspace folders
export { FolderStore, FolderUIStoreProvider, useFolderStore } from '@/store/folderUI/FolderStore';
export type { FolderUIStoreData } from '@/store/folderUI/FolderStore';
export { useFolderHelper } from '@/hooks/explorer/useFolderHelper';

// Legacy compatibility - use store + helper instead
// Note: Use workspace.service directly instead of deprecated hooks