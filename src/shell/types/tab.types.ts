/**
 * Generic Tab Types for Editor Area
 * Shell owns tab lifecycle — data payload is unknown at this layer.
 * Features cast `tab.data` to their own types at consumption sites.
 */

import { shellConstants } from "@/shell";
import type { BreadcrumbItem } from "../utils/breadcrumb.utils";

export type TabType =
    | typeof shellConstants.vscode.tab.tabTypes.note
    | typeof shellConstants.vscode.tab.tabTypes.workspace
    | typeof shellConstants.vscode.tab.tabTypes.trackingGraph
    | typeof shellConstants.vscode.tab.tabTypes.project
    | typeof shellConstants.vscode.tab.tabTypes.multiProject
    | typeof shellConstants.vscode.tab.tabTypes.task
    | typeof shellConstants.vscode.tab.tabTypes.lifeLog
    | typeof shellConstants.vscode.tab.tabTypes.lifeLogGraph
    | typeof shellConstants.vscode.tab.tabTypes.lifeLogTrack
    | typeof shellConstants.vscode.tab.tabTypes.kKnowledge
    | typeof shellConstants.vscode.tab.tabTypes.kNode
    | typeof shellConstants.vscode.tab.tabTypes.kDailyReview
    | typeof shellConstants.vscode.tab.tabTypes.wikiInfo
    | "folder"
    | "settings";

// ── Minimal shell-owned data shapes ──────────────────────────────────────────

export interface TrackingGraphTabData {
    type?: string;
}

/** Shell-owned contract for multi-project tab data. Feature casts projects as needed. */
export interface MultiProjectTabData {
    projectIds: number[];
    projects: unknown[];
}

export interface KDailyReviewTabData {
    knowledgeId: number;
    knowledgeName: string;
}

// ── Tab meta passed by features when opening a tab ────────────────────────────

/**
 * Minimal metadata a feature provides when opening a tab.
 * Shell builds the full BaseTab from this — features never construct BaseTab directly.
 *
 * Note: this is intentionally separate from `TabMeta` (moduleRegistry.type.ts)
 * which carries visual metadata (icon + color) for the tab button.
 */
export interface TabOpenMeta {
    /** Tab title — falls back to data.name / data.title if omitted. */
    title?: string;
    hasUnsavedChanges?: boolean;
    isPinned?: boolean;
    openedBy?: { link: string; label: string };
    /** Provide a fixed id for singleton tabs (stable across sessions). */
    tabId?: string;
    /** Arbitrary tab metadata (e.g. taskId, folderWorkspaceItemId for note-from-task). */
    metadata?: Record<string, unknown>;
}

// ── View state ────────────────────────────────────────────────────────────────

export interface TabViewState {
    /** Scroll position in the editor content container */
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
}

// ── Core tab shape ────────────────────────────────────────────────────────────

export interface BaseTab {
    id: string;
    /** Feature-specific payload — cast to concrete type at consumption site. */
    data: unknown;
    /** Original data snapshot (for dirty-checking). */
    data0: unknown;
    type: TabType;
    title: string;
    hasUnsavedChanges?: boolean;
    viewState?: TabViewState;
    isPinned?: boolean;
    breadcrumb?: BreadcrumbItem[];
    /** The entity that opened this tab (for back button). */
    openedBy?: { link: string; label: string };
    /** Generic metadata for storing UI state (inner tabs, selections, etc.) */
    metadata?: Record<string, unknown>;
}

export interface EditorState {
    openTabs: BaseTab[];
    activeTabId: string | null;
}

// ── Tab state helpers — eliminate `as any` casts in shell components ──────────

/**
 * Read soft-delete display state from a tab's data payload.
 * Features that support soft-delete set `deletedAt` / `isHardDeleted` on their
 * entity data. Shell uses this to drive strikethrough styling and Restore button.
 */
export function getTabDeleteState(tab: BaseTab): {
    isDeleted: boolean;
    isPermanentlyDeleted: boolean;
} {
    const data = tab.data as { deletedAt?: unknown; isHardDeleted?: unknown } | null;
    return {
        isDeleted: !!data?.deletedAt,
        isPermanentlyDeleted: !!data?.isHardDeleted,
    };
}

/**
 * Returns true when the tab represents a brand-new entity not yet persisted to
 * the backend (i.e. `data.id < 0`).
 * Used by UnsavedTabsTooltip to block navigation while unsaved new entities exist.
 */
export function isTabNewEntity(tab: BaseTab): boolean {
    const data = tab.data as { id?: unknown } | null;
    return typeof data?.id === "number" && data.id < 0;
}
