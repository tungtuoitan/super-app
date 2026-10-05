/**
 * Task Detail — domain types for task detail editor features
 */

import type { Keyword } from "@/shared";
import type { TargetKeywordTargetType } from "@/shared";
import type { LinkDTO } from "@/shared";
import type { NoteEntity } from "@/features/workspace";

export interface TaskFolderItem {
    workspaceItemId: number;
    entityId: number;
    entityType: 3 | 4;
    name: string;
    noteData?: NoteEntity;
    /** File items: url to open (Drive webViewLink). */
    url?: string | null;
    /** workspace_items.created_at (ISO) — orders the Notes & Links list. */
    createdAt?: string | null;
}

/** One row of the "Notes & Links" section (task #1487): task folder items + task links merged. */
export interface TaskNotesLinksItem {
    workspaceItemId: number;
    kind: "note" | "link" | "file" | "folder";
    name: string;
    url?: string | null;
    createdAt?: string | null;
    /** Tied through pro.task_workspace_item but living outside the task folder → only unlinked. */
    isFromElsewhere: boolean;
    /** Set when the row comes from the task folder (tree) — notes open from it. */
    folderItem?: TaskFolderItem;
    /** Set when the row comes from GET /api/task/{id}/links — links edit/remove through it. */
    link?: LinkDTO;
}

export interface LinkedKeyword {
    linkId: number; // TargetKeyword.id
    targetId: number;
    targetType: TargetKeywordTargetType;
    keywordId: number;
    // Resolved from allKeywords
    name: string;
    type: Keyword["type"];
    link: string;
    longLink: string;
    icon?: string;
    color?: string;
    workspaceItemId?: number; // for folder/note/file keywords
}

/** DTO shape for task-workspace item links */
export interface TaskWorkspaceItemDTO {
    id: number;
    taskId: number;
    workspaceItemId: number;
    itemType: number; // 2 = Folder, 3 = Note, 4 = File/link
}
