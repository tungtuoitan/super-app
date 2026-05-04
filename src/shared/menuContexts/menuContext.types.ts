/**
 * Context Menu Data Types
 * Typed contextData payloads for each menu.
 *
 * Pattern B menus: contain only data (no callbacks).
 * Pattern A menus (legacy): still use callbacks — types provided for casting.
 */

// ── Pattern B menus (data-only) ───────────────────────────────────────────

export interface NoteGridMenuData {
    selectedIds: number[];
    selectedNotes: Array<{ id: number; deletedAt: Date | string | null }>;
}

export interface ProjectGridMenuData {
    selectedIds: number[];
    selectedProjects: Array<{ id: number; deletedAt?: Date | null }>;
}

export interface TaskGridMenuData {
    selectedIds: number[];
    selectedTasks: Array<{ id: number; deletedAt?: Date | null }>;
    hoveredTask: { id: number; deletedAt?: Date | null; parentTaskId: number | null } | null;
    /** Project ID context for task creation / reload */
    projectId?: number;
    /** Callback to notify task panel of new task (scroll-to) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onTaskCreated?: (task: any) => void;
}

export interface WsGridMenuData {
    selectedIds: number[];
    selectedWorkspaces: Array<{ id: number; deletedAt?: Date | null }>;
}

export interface TaskFlowMenuData {
    flowPosition: { x: number; y: number };
}

// ── Pattern A menus (legacy — callbacks in data) ───────────────────────────

export interface WorkspaceSelectorMenuData {
    hasSelected: boolean;
    onAdd?: () => void;
    onEdit?: () => void;
    onDelete?: () => Promise<void>;
}

export interface LogListMenuData {
    onDelete?: () => void;
}

export interface TrackPanelMenuData {
    onEdit?: () => void;
    onDelete?: () => void;
}

export interface KKnowledgeSelectorMenuData {
    hasSelected: boolean;
    onAdd?: () => void;
    onEdit?: () => void;
    onDelete?: () => Promise<void>;
}

export interface KQFlowMenuData {
    selectedIds: number[];
    onAddQuestion?: () => void;
    onDeleteSelected?: () => void;
}

export interface RichTextEditorMenuData {
    onCopyPlainText?: () => void;
}
