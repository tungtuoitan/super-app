/**
 * Note Confirmation Messages
 * Delete confirmation dialogs for notes
 */

import { type ConfirmMessage, type DeleteType } from "@/shared";

export type NoteEntityType = "note";

export interface NoteConfirmMessageParams {
    type: DeleteType;
    count: number;
    isMultiple: boolean;
    entityName?: string;
}

export const getNoteConfirmMessage = (params: NoteConfirmMessageParams): ConfirmMessage => {
    const { type, count, isMultiple, entityName } = params;

    if (type === "soft-delete") {
        if (isMultiple) {
            return { title: `Delete ${count} notes?`, subtitle: `Are you sure you want to delete ${count} selected notes?` };
        } else {
            return entityName
                ? { title: `Delete "${entityName}"?`, subtitle: "This note will be moved to trash." }
                : { title: "Delete this note?", subtitle: "Are you sure you want to delete this note?" };
        }
    } else {
        if (isMultiple) {
            return { title: `⚠️ Permanently delete ${count} notes?`, subtitle: `This action CANNOT be undone. All note content will be LOST FOREVER.` };
        } else {
            return entityName
                ? { title: `⚠️ Permanently delete "${entityName}"?`, subtitle: "This action CANNOT be undone. The note content will be LOST FOREVER." }
                : { title: "⚠️ Permanently delete this note?", subtitle: "This action CANNOT be undone. All note content will be LOST FOREVER." };
        }
    }
};
