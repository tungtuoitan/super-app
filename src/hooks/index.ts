/**
 * Hooks Index
 * 
 * ✅ MODERN ARCHITECTURE:
 * - For server state: Use React Query hooks from '@/features/[feature]/hooks'
 * - For UI state: Use Context providers from '@/features/[feature]/store'
 * 
 * Example:
 * import { useNotes, useCreateNote } from '@/features/notes'
 */

// Auth helpers (still needed for authentication flow)
export * from './useAuth.helpers';
export { useAuthHelper } from './useAuth.helpers';

// UI helpers
export * from './note/useNoteDetail.helper';
export * from './note/useNoteGrid.helper';
export * from './vsCode/useEditorTab.helper';
export * from './vsCode/useEditorToolbar.helper';
export * from './vsCode/useGridControl.helper';
export * from './useActivityBar.helper';

// Context menu helpers
export * from './useContextMenu.helper';
export * from './useConfirmationPopover.helper';

// Workspace helpers
export * from './ws/useWs.helper';
export * from './ws/useWsDetail.helper';
export * from './ws/useWsTab.helper';

// Explorer helpers
export * from './explorer/useWorkspaceOperation.helper';
export * from './explorer/useFolderDialog.helper';
export * from './explorer/useTreeSelection.helper';
export * from './explorer/useTreeExpansion.helper';
export * from './explorer/useTreeOperation.helper';
export * from './explorer/tree.helper';
