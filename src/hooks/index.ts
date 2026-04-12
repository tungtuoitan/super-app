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
export * from "./vsCode/useEditorTab.helper";
export * from "./vsCode/useEditorToolbar.helper";
export { useNavigationHistoryHelper, STORAGE_KEY_PREFIX, MAX_PAST_SIZE, getStorageKey } from "./vsCode/useNavigationHistory.helper";
export type { HistoryStorage } from "./vsCode/useNavigationHistory.helper";
export * from "./useActivityBar.helper";

// Context menu helpers
export * from "./useConfirmationPopover.helper";

// Workspace helpers
export * from "./ws/useWsGrid.helper";
export * from "./ws/useWsDetail.helper";
export * from "./ws/useWsTab.helper";

// Workspace helpers
export * from "./workspace/useWorkspace.loader";
export * from "./workspace/useFolderDialog.helper";
export * from "./workspace/useTreeHelper2";
export * from "./workspace/useTreeHelper";
export * from "./workspace/tree.miniHelper";

// Standard Registry helpers
export * from "./standardRegistry/useStandardRegistry.helper";

// Filter helpers
export { useGenericFilterHelper } from "./useGenericFilterHelper";

// Command Palette helpers
export * from "./vsCode/useCommandPalette.helper";
