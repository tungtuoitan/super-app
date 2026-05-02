/**
 * Note Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the note feature should use relative paths.
 *
 * ─── Cluster note ────────────────────────────────────────────────────────────
 * `note` and `workspace` form a tightly-coupled cluster.
 * See `@/features/workspace` (index.ts) for the full cluster description.
 *
 *  • `note` consumes `useWorkspaceStore`, `useWorkspaceItemHelper`,
 *    `useWorkspaceLoader`, and `WorkspaceItemAction` from `workspace` to link
 *    saved notes to workspace items and reflect status in the tree.
 *
 *  • `workspace` consumes `noteService`, `useNoteDetailStore`, and `Note`
 *    type from `note` to render and manage note nodes inside the workspace tree.
 *
 *  • Cross-imports within the cluster are intentional and expected.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Components (used by VSEditorArea, VSSideBar)
export { NoteGrid } from "./Components/NoteGrid";
export { NoteDetailContent } from "./Components/NoteDetailContent";
export { NoteEditorPanel } from "./Components/NoteEditorPanel";
export { NoteBodyInPanel } from "./Components/NoteBodyInPanel";

// Stores/Providers (used by Main.tsx)
export { NoteDetailProvider, useNoteDetailStore } from "./store/useNoteDetail.store";
export { useNoteGridStore, getNoteGridState, subscribeNoteGridState } from "./store/useNoteGrid.store";

// Hooks (used by workspace feature - NoteGridPopup helper)
export { useNoteGridHelper } from "./hooks/useNoteGrid.helper";
export { useNoteDetailHelper } from "./hooks/useNoteDetail.helper";

// Types (used by workspace feature for isNote checks, etc.)
export type { Note, NoteDTO, UpsertNoteDTO, WorkspaceLink, NoteType } from "./types/note.types";
// Service (used by workspace feature to link notes)
export { noteService } from "./service/note.service";

// Utils (used by workspace feature for transformations)
export { transformANote, transformNotes, formatNoteDate } from "./utils/note.utils";


// Providers
export { NoteProviders } from "./store/NoteProviders";

// Hooks
export { useNoteSaveActions } from "./hooks/useNoteSaveActions";

// shell module

// Context menus
export { NoteGridMenu } from "./contexts/menus/NoteGridMenu";
export { RichTextEditorMenu } from "./contexts/menus/RichTextEditorMenu";export { registerNoteFilters } from "./shell/note.filterConfig";

