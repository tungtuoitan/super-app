/**
 * Note Feature - Public API
 * Only export what other features/layers need to use.
 * Internal implementation details stay private.
 */

// Components (used by VSEditorArea, VSSideBar)
export { NoteGrid } from "./Components/NoteGrid";
export { NoteDetailContent } from "./Components/NoteDetailContent";
export { NoteEditorPanel } from "./Components/NoteEditorPanel";
export { NoteGridPopup } from "./Components/NoteGridPopup";

// Stores/Providers (used by Main.tsx)
export { NoteDetailProvider, useNoteDetailStore } from "./store/useNoteDetail.store";
export { NoteGridProvider, useNoteGridStore } from "./store/useNoteGrid.store";
export { NoteGridPopupProvider, useNoteGridPopupStore } from "./store/useNoteGridPopup.store";

// Hooks (used by workspace feature - NoteGridPopup helper)
export { useNoteGridPopupHelper } from "./hooks/useNoteGridPopup.helper";
export { useNoteGridHelper } from "./hooks/useNoteGrid.helper";
export { useNoteDetailHelper } from "./hooks/useNoteDetail.helper";

// Types (used by workspace feature for isNote checks, etc.)
export type { Note, NoteDTO, UpsertNoteDTO, WorkspaceLink, NoteType } from "./types/note.types";

// Service (used by workspace feature to link notes)
export { noteService } from "./service/note.service";

// Utils (used by workspace feature for transformations)
export { transformANote, transformNotes, formatNoteDate } from "./utils/note.utils";
