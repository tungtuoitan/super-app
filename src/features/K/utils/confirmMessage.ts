/**
 * K Feature Confirmation Messages
 * Delete confirmation dialogs for K folders
 */

import { type ConfirmMessage, type DeleteType } from "@/shared";

export type KEntityType = "folder";

export interface KConfirmMessageParams {
    type: DeleteType;
    entityType: KEntityType;
    count: number;
    isMultiple: boolean;
    entityName?: string;
    childCount?: number;
}

export const getKConfirmMessage = (params: KConfirmMessageParams): ConfirmMessage => {
    const { type, count, isMultiple, entityName, childCount = 0 } = params;

    if (type === "soft-delete") {
        if (isMultiple) {
            return { title: `Delete ${count} folders?`, subtitle: `Are you sure you want to delete ${count} selected folders?` };
        } else {
            return entityName
                ? { title: `Delete "${entityName}"?`, subtitle: childCount > 0 ? `This folder contains ${childCount} child folder(s).` : `This folder will be moved to trash.` }
                : { title: "Delete this folder?", subtitle: undefined };
        }
    } else {
        if (isMultiple) {
            return { title: `⚠️ Permanently delete ${count} folders?`, subtitle: "This will PERMANENTLY delete ALL their contents (subfolders). This action CANNOT be undone." };
        } else {
            return entityName && childCount > 0
                ? { title: `⚠️ Permanently delete "${entityName}"?`, subtitle: `This will PERMANENTLY delete this folder and ${childCount} child folder(s) with ALL their contents. This action CANNOT be undone.` }
                : entityName
                ? { title: `⚠️ Permanently delete "${entityName}"?`, subtitle: "This will PERMANENTLY delete ALL contents. This action CANNOT be undone." }
                : { title: "⚠️ Permanently delete this folder?", subtitle: "This action CANNOT be undone. All folder content will be LOST FOREVER." };
        }
    }
};
