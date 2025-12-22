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
export * from './useNoteUI.helper';
export * from './useNoteTab.helper';
export * from './useEditorTab.helper';
export * from './useEditorActions.helper';
export * from './useActivityBar.helper';

export * from './useContextMenu.helper';
