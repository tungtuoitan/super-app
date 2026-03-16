/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Folder, etc.
 */

import { Note } from "@/types/note.types";
import { Ws } from "@/types/workspace.types";
import { TrackingGraphTabData } from "@/types/tracking.types";
import { Project } from "@/store/project/useProject.store";
import { Task } from "@/store/task/useTask.store";
import { LifeLogLog, LifeLogTrack } from "@/types/lifeLog.types";
import { KWsResponse } from "@/Components/K/types/K.types";
import { KItemV2 } from "@/Components/K/types/K-v2.types";
import { constants } from "@/utils/constants";
import {BreadcrumbItem} from "@/utils/breadcrumb.utils";

export type TabType = typeof constants.vscode.tab.tabTypes.note | typeof constants.vscode.tab.tabTypes.workspace | typeof constants.vscode.tab.tabTypes.trackingGraph | typeof constants.vscode.tab.tabTypes.project | typeof constants.vscode.tab.tabTypes.multiProject | typeof constants.vscode.tab.tabTypes.task | typeof constants.vscode.tab.tabTypes.lifeLog | typeof constants.vscode.tab.tabTypes.lifeLogGraph | typeof constants.vscode.tab.tabTypes.lifeLogTrack | typeof constants.vscode.tab.tabTypes.kKnowledge | typeof constants.vscode.tab.tabTypes.kNode | "folder" | "settings";

/**
 * Data type for multi-project tab
 * Contains array of project IDs and their names for display
 */
export interface MultiProjectTabData {
    projectIds: number[];
    projects: Project[];
}

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
    data: Note | Ws | TrackingGraphTabData | Project | Task | MultiProjectTabData | LifeLogLog | LifeLogTrack | KWsResponse | KItemV2 | null;
    data0: Note | Ws | TrackingGraphTabData | Project | Task | MultiProjectTabData | LifeLogLog | LifeLogTrack | KWsResponse | KItemV2 | null;
    type: TabType;
    title: string;
    hasUnsavedChanges?: boolean;
    viewState?: TabViewState;
    isPinned?: boolean;
    breadcrumb?: BreadcrumbItem[];
    /** The keyword link + label of the entity that opened this tab (for back button) */
    openedBy?: { link: string; label: string };
    /** Generic metadata for storing UI state (inner tabs, selections, etc.) */
    metadata?: Record<string, unknown>;
}

export interface EditorState {
    openTabs: BaseTab[];
    activeTabId: string | null;
}
