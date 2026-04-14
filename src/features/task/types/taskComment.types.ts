/**
 * Task Comment Types
 * Domain types for the per-task comment system.
 */

export interface TaskComment {
    id: number;
    taskId: number;
    parentCommentId?: number | null;
    content: string;
    userId: number;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
    /** Populated on frontend from flat list → tree */
    replies?: TaskComment[];
}

export interface TaskCommentDTO {
    id: number;
    taskId: number;
    parentCommentId?: number | null;
    content: string;
    userId: number;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface VersionPayload {
    type: "version";
    section: "process" | "checklist" | "desc";
    oldText: string;
    newText: string;
}

export interface SimpleDiffProps {
    oldText: string;
    newText: string;
    oldLabel?: string;
    newLabel?: string;
    showImageDiff?: boolean;
    onContentExpand?: () => void;
    stripHtml?: boolean;
}

export interface InlineSegment { type: "equal" | "add" | "remove"; text: string; }

export interface DiffLine {
    type: "add" | "remove" | "equal" | "modify";
    content: string;
    /** For "modify" lines: inline word-level diff segments */
    segments?: InlineSegment[];
    /** Which side: "old" = removal half, "new" = addition half (only for modify) */
    side?: "old" | "new";
    oldLineNo?: number;
    newLineNo?: number;
}
export interface ImageInfo { fileId: string; src: string; }

export type CommentFilterType = "all" | "comment" | "process" | "checklist" | "desc" | "custom";
