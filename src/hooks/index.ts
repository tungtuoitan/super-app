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
export * from './useAuthHelpers';
export { useAuthHelper } from './useAuthHelpers';

// UI helpers
export * from './useNoteUIHelper';
export * from './useNoteTabHelper';
export * from './useEditorTabHelper';
export * from './useContextMenuHelper';
export * from './useTagUIHelper';

// Reference implementations (kept for historical purposes)
// export * from './useAuth.old';
// export * from './useDialog.old';
// export * from './useApi.old';
