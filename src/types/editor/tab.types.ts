/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Tag, etc.
 */

import {Note} from "@/Components/Notes/note.types";


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

export interface TagTab extends BaseTab {
    type: 'tag';
    tagId: number;
    // tag: Tag; // Will be added later
}

export type EditorTab = NoteTab | TagTab;

export interface EditorState {
    openTabs: EditorTab[];
    activeTabId: string | null;
}
