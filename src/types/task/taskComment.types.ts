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
