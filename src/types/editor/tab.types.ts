/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Folder, etc.
 */

import {Note} from "@/types/note.types";
import {Ws} from "@/store/ws/useWsList.store";
import { constants } from '@/utils/constants';


export type TabType = typeof constants.tabTypes.note | typeof constants.tabTypes.workspace | 'tag' | 'settings';

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
    data: Note | Ws;
    type: TabType;
    title: string;
    hasUnsavedChanges?: boolean;
    viewState?: TabViewState;
    isDeleted?: boolean;  // Flag to indicate note has been deleted
}

    export interface EditorState {
    openTabs: BaseTab[];
    activeTabId: string | null;
}
