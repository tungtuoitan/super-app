/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Folder, etc.
 */

import { Note } from "@/types/note.types";
import { Ws } from "@/types/workspace.types";
import { TrackingGraphTabData } from "@/types/tracking.types";
import { Project } from "@/store/project/useProject.store";
import { Task } from "@/store/task/useTask.store";
import { constants } from "@/utils/constants";
import {BreadcrumbItem} from "@/utils/breadcrumb.utils";

export type TabType = typeof constants.vscode.tab.tabTypes.note | typeof constants.vscode.tab.tabTypes.workspace | typeof constants.vscode.tab.tabTypes.trackingGraph | typeof constants.vscode.tab.tabTypes.project | typeof constants.vscode.tab.tabTypes.task | "folder" | "settings";

/**
 * Tab-specific view state for preserving UI state across tab switches
 * Extensible for future needs (cursor position, expanded sections, etc.)
 */
export interface TabViewState {
    /** Scroll position in the editor content container (div) */
    scrollTop?: number;

    /** Monaco editor cursor position */
    editorPosition?: {
        lineNumber: number;
        column: number;
    };

    /** Monaco editor scroll position */
    editorScrollPosition?: {
        scrollTop: number;
        scrollLeft: number;
    };

    // Future extensions:
    // expandedSections?: string[];
    // selectedText?: { start: number; end: number };
    // zoom?: number;
}

export interface BaseTab {
    id: string;
    data: Note | Ws | TrackingGraphTabData | Project | Task;
    data0: Note | Ws | TrackingGraphTabData | Project | Task;
    type: TabType;
    title: string;
    hasUnsavedChanges?: boolean;
    viewState?: TabViewState;
    isPinned?: boolean;
    breadcrumb?: BreadcrumbItem[];
}

export interface EditorState {
    openTabs: BaseTab[];
    activeTabId: string | null;
}
