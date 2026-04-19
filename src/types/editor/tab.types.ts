/**
 * Generic Tab Types for Editor Area
 * Supports multiple tab types: Note, Folder, etc.
 */

import { Note } from "@/features/note/types/note.types";
import { Ws } from "@/types/workspace.types";
import { TrackingGraphTabData } from "@/utils/tracking.types";
import { Project } from "@/features/project/store/useProject.store";
import { Task } from "@/features/task/store/useTask.store";
import { LifeLogLog, LifeLogTrack } from "@/features/lifeLog/types/lifeLog.types";
import { KWsResponse } from "@/features/K/types/K.types";
import { KItemV2 } from "@/features/K/types/K-v2.types";
import { constants } from "@/utils/constants";
import {BreadcrumbItem} from "@/utils/breadcrumb.utils";
import { WikiTabData } from "@/features/Wiki/types/wiki.type";

export type TabType = typeof constants.vscode.tab.tabTypes.note | typeof constants.vscode.tab.tabTypes.workspace | typeof constants.vscode.tab.tabTypes.trackingGraph | typeof constants.vscode.tab.tabTypes.project | typeof constants.vscode.tab.tabTypes.multiProject | typeof constants.vscode.tab.tabTypes.task | typeof constants.vscode.tab.tabTypes.lifeLog | typeof constants.vscode.tab.tabTypes.lifeLogGraph | typeof constants.vscode.tab.tabTypes.lifeLogTrack | typeof constants.vscode.tab.tabTypes.kKnowledge | typeof constants.vscode.tab.tabTypes.kNode | typeof constants.vscode.tab.tabTypes.kDailyReview | typeof constants.vscode.tab.tabTypes.wikiInfo | "folder" | "settings";

/**
 * Data type for multi-project tab
 * Contains array of project IDs and their names for display
 */
export interface MultiProjectTabData {
    projectIds: number[];
    projects: Project[];
}

export interface KDailyReviewTabData {
    knowledgeId: number;
    knowledgeName: string;
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
    data: Note | Ws | TrackingGraphTabData | Project | Task | MultiProjectTabData | LifeLogLog | LifeLogTrack | KWsResponse | KItemV2 | KDailyReviewTabData | WikiTabData | null;
    data0: Note | Ws | TrackingGraphTabData | Project | Task | MultiProjectTabData | LifeLogLog | LifeLogTrack | KWsResponse | KItemV2 | KDailyReviewTabData | WikiTabData | null;
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
