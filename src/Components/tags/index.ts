// Tags Feature Public Exports

// Components
export { AddFolderDialog } from './AddFolderDialog';
export { WorkspaceTree } from '../Explorer/WorkspaceTree';
export { CreateFolderDialog } from './CreateFolderDialog';
export { EditWorkspaceItemDialog } from './EditWorkspaceItemDialog';

// NEW: Use these for workspace folders
export { ExplorerStore, ExplorerProvider, useExplorerStore } from '@/store/explorer/ExplorerStore';
export type { ExplorerContextData } from '@/store/explorer/ExplorerStore';
export { useFolderHelper } from '@/hooks/explorer/useFolderHelper';

// Legacy compatibility - use store + helper instead
// Note: Use workspace.service directly instead of deprecated hooks