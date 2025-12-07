/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Folder, etc.
 */

import {Note} from "@/types/note.types";


export type TabType = 'note' | 'tag' | 'settings';

/**
 * Tab-specific view state for preserving UI state across tab switches
 * Extensible for future needs (cursor position, expanded sections, etc.)
 */
export interface TabViewState {
    /** Scroll position in the editor content */
    scrollTop?: number;
    
    // Future extensions:
    // cursorPosition?: { line: number; column: number };
    // expandedSections?: string[];
    // selectedText?: { start: number; end: number };
    // zoom?: number;
}

export interface BaseTab {
    id: string;
    type: TabType;
    title: string;
    hasUnsavedChanges?: boolean;
    viewState?: TabViewState;
}

export interface NoteTab extends BaseTab {
    type: 'note';
    noteId: number;  // Note ID for tab identification
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
