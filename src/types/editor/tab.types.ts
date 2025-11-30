/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Folder, etc.
 */

import {Note} from "@/types/note.types";


export type TabType = 'note' | 'tag' | 'settings';

export interface BaseTab {
    id: string;
    type: TabType;
    title: string;
    hasUnsavedChanges?: boolean;
}

export interface NoteTab extends BaseTab {
    type: 'note';
    noteId: number;
    note: Note;
}

export interface FolderTab extends BaseTab {
    type: 'tag';
    tagId: number;
    // Folder data will be added later
}

export type EditorTab = NoteTab | FolderTab;

export interface EditorState {
    openTabs: EditorTab[];
    activeTabId: string | null;
}
