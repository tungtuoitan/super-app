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
export * from "./useAuth.helpers";
export { useAuthHelper } from "./useAuth.helpers";

// UI helpers
export * from "./note/useNoteDetail.helper";
export * from "./note/useNoteGrid.helper";
export * from "./vsCode/useEditorTab.helper";
export * from "./vsCode/useEditorToolbar.helper";
export * from "./vsCode/useGridControl.helper";
export * from "./useActivityBar.helper";

// Context menu helpers
export * from "./useConfirmationPopover.helper";

// Workspace helpers
export * from "./ws/useWsGrid.helper";
export * from "./ws/useWsDetail.helper";
export * from "./ws/useWsTab.helper";

// Workspace helpers
export * from "./workspace/useWorkspaceOperation.helper";
export * from "./workspace/useFolderDialog.helper";
export * from "./workspace/useTreeSelection.helper";
export * from "./workspace/useTreeOperation.helper";
export * from "./workspace/tree.helper";

// Standard Registry helpers
export * from "./standardRegistry/useStandardRegistry.helper";

// Filter helpers
export * from "./filter/useFilter.helper";
export { useFilterHelper } from "./filter/useFilter.helper";
export { useGenericFilterHelper } from "./useGenericFilterHelper";
