// Tags Feature Public Exports

// Components
export { AddFolderDialog } from './AddFolderDialog';
export { WorkspaceTree } from '../Explorer/WorkspaceTree';
export { CreateFolderDialog } from './CreateFolderDialog';
export { EditWorkspaceItemDialog } from './EditWorkspaceItemDialog';

// NEW: Use these for workspace folders
export { ExplorerStore, ExplorerProvider, useExplorerStore } from '@/store/explorer/ExplorerStore';
export type { ExplorerContextData } from '@/store/explorer/ExplorerStore';


// Sub-helpers (use directly for specific operations)
export { useWorkspaceOperation } from '@/hooks/explorer/useWorkspaceOperation.helper';
export { useDialogAction } from '@/hooks/explorer/useDialogAction.helper';
export { useTreeExpansion } from '@/hooks/explorer/useTreeExpansion.helper';
export { useTreeSelection } from '@/hooks/explorer/useTreeSelection.helper';
export { useTreeOperation } from '@/hooks/explorer/useTreeOperation.helper';

// Legacy compatibility - use store + helper instead
// Note: Use workspace.service directly instead of deprecated hooks