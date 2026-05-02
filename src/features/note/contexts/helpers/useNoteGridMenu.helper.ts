/**
 * Note Grid Menu Helper — Pattern B
 * Reads typed contextData; calls useNoteGridHelper directly.
 * No callbacks stored in contextData.
 */

import { useOrchestratorContextMenuStore } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";
import { getGenericConfirmMessage } from "@/shared";
import type { NoteGridMenuData } from "@/shared";
import { useNoteGridHelper } from "../../hooks/useNoteGrid.helper";

export const useNoteGridMenuHelper = () => {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { createNewNote, deleteRestoreSelectedNotes, hardDeleteSelectedNotes } = useNoteGridHelper();

    const data = contextData as NoteGridMenuData | null;
    const selectedIds    = data?.selectedIds    ?? [];
    const selectedNotes  = data?.selectedNotes  ?? [];

    const selectedCount        = selectedIds.length;
    const allAreTempNotes      = selectedCount > 0 && selectedIds.every((id) => id < 0);
    const anySelectedDeleted   = selectedNotes.some(
        (n) => n.deletedAt !== null && n.deletedAt !== undefined,
    );

    const addNote = () => {
        setIsContextMenuOpen(false);
        createNewNote();
    };

    const softDelete = (anchorEl: HTMLElement | null) => {
        setIsContextMenuOpen(false);
        if (allAreTempNotes) {
            deleteRestoreSelectedNotes(selectedIds, "soft-delete");
            return;
        }
        const msg = getGenericConfirmMessage({
            type: "soft-delete",
            entityType: "note",
            count: selectedCount,
            isMultiple: selectedCount > 1,
        });
        showConfirmation({
            anchorEl,
            title: msg.title,
            subtitle: msg.subtitle,
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => deleteRestoreSelectedNotes(selectedIds, "soft-delete"),
        });
    };

    const hardDelete = (anchorEl: HTMLElement | null) => {
        setIsContextMenuOpen(false);
        const msg = getGenericConfirmMessage({
            type: "hard-delete",
            entityType: "note",
            count: selectedCount,
            isMultiple: selectedCount > 1,
        });
        showConfirmation({
            anchorEl,
            title: msg.title,
            subtitle: msg.subtitle,
            confirmText: "Delete Permanently",
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm: () => hardDeleteSelectedNotes(selectedIds),
        });
    };

    const restore = () => {
        setIsContextMenuOpen(false);
        deleteRestoreSelectedNotes(selectedIds, "restore");
    };

    return {
        selectedCount,
        allAreTempNotes,
        anySelectedDeleted,
        addNote,
        softDelete,
        hardDelete,
        restore,
    };
};
