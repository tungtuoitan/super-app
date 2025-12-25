import React from 'react';
import { MenuItem, MenuDivider } from '@szhsin/react-menu';
import {
    Plus as AddIcon,
    Trash2 as DeleteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon
} from 'lucide-react';
import { useContextMenuHelper } from '@/shared/contexts/helpers/useContextMenu.helper';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';

/**
 * NoteGridMenu
 * Context menu for note grid/table view
 *
 * Features:
 * - Add new note
 * - Delete selected notes (single or bulk) - only shown if notes are NOT deleted
 * - Hard delete (permanent) - only shown if notes ARE deleted
 * - Restore - only shown if notes ARE deleted
 */
export function NoteGridMenu() {
    const { contextData } = useContextMenuStore();
    const { openConfirmDialog, executeDirectly } = useContextMenuHelper();

    // Calculate derived values from contextData
    const noteGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempNotes = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;

    // Check if any selected notes have deletedAt (are in deleted state)
    const anySelectedDeleted = contextData?.selectedNotes?.some((note: any) => note.deletedAt !== null && note.deletedAt !== undefined) ?? false;
    const allSelectedDeleted = contextData?.selectedNotes?.every((note: any) => note.deletedAt !== null && note.deletedAt !== undefined) ?? false;

    return (
        <>
            {/* Add Note */}
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddNote! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add
            </MenuItem>

            <MenuDivider />

            {/* Show Delete option only if notes are NOT deleted */}
            {!anySelectedDeleted && (
                <MenuItem onClick={(e) => openConfirmDialog({
                    type: 'soft-delete',
                    entityType: 'note',
                    count: noteGridSelectedCount,
                    allAreTempItems: allSelectedAreTempNotes,
                    onConfirm: contextData?.onSoftDelete!,
                    event: e,
                })}>
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {/* Show Hard Delete and Restore only if notes ARE deleted */}
            {anySelectedDeleted && !allSelectedAreTempNotes && (
                <>
                    <MenuItem
                        onClick={(e) => openConfirmDialog({
                            type: 'hard-delete',
                            entityType: 'note',
                            count: noteGridSelectedCount,
                            allAreTempItems: false,
                            onConfirm: contextData?.onHardDelete!,
                            event: e,
                        })}
                        className="text-red-600 hover:bg-red-50"
                    >
                        <HardDeleteIcon className="w-4 h-4 mr-2" />
                        Hard Delete
                    </MenuItem>

                    <MenuItem onClick={() => executeDirectly({ callback: contextData?.onRestore! })}>
                        <RestoreIcon className="w-4 h-4 mr-2" />
                        Restore
                    </MenuItem>
                </>
            )}
        </>
    );
}
