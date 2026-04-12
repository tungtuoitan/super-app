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

// Shell hooks (re-exported for backward compatibility)
export * from "@/shell/hooks/useEditorTab.helper";
export * from "@/shell/hooks/useEditorToolbar.helper";
export { useNavigationHistoryHelper, STORAGE_KEY_PREFIX, MAX_PAST_SIZE, getStorageKey } from "@/shell/hooks/useNavigationHistory.helper";
export type { HistoryStorage } from "@/shell/hooks/useNavigationHistory.helper";
export * from "./useActivityBar.helper";

// Context menu helpers
export * from "./useConfirmationPopover.helper";

// Workspace helpers
export * from "./ws/useWsGrid.helper";
export * from "./ws/useWsDetail.helper";
export * from "./ws/useWsTab.helper";

// Workspace helpers
export * from "@/features/workspace/hooks/useWorkspace.loader";
export * from "@/features/workspace/hooks/useFolderDialog.helper";
export * from "@/features/workspace/hooks/useTreeHelper2";
export * from "@/features/workspace/hooks/useTreeHelper";
export * from "@/features/workspace/hooks/tree.miniHelper";

// Standard Registry helpers
export * from "./standardRegistry/useStandardRegistry.helper";

// Filter helpers
export { useGenericFilterHelper } from "./useGenericFilterHelper";

// Command Palette helpers
export * from "./vsCode/useCommandPalette.helper";
