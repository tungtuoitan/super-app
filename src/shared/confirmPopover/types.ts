/**
 * Confirmation Message Types
 * Shared types for confirmation dialogs
 */

export type DeleteType = "soft-delete" | "hard-delete";

export interface ConfirmMessage {
    title: string;
    subtitle?: string;
}

export interface GetConfirmMessageParams {
    type: DeleteType;
    entityType: string;
    count: number;
    isMultiple: boolean;
    entityName?: string;
    childCount?: number;
}
