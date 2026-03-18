/**
 * Task Detail — domain types for task detail editor features
 */

import type { Keyword } from "@/types/keyword.types";
import type { TargetKeywordTargetType } from "@/services/targetKeyword.service";
import type { NoteEntity } from "@/types/workspace-v2.types";

export interface TaskFolderItem {
    workspaceItemId: number;
    entityId: number;
    entityType: 3 | 4;
    name: string;
    noteData?: NoteEntity;
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
    itemType: number; // 2 = Folder, 3 = Note
}
