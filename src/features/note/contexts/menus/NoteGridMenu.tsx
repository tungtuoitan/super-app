import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, AlertTriangle as HardDeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useMenuContext, useMenuContextHelper } from "@/shared";

export function NoteGridMenu() {
    const { contextData } = useMenuContext();
    const { openConfirmDialog, executeDirectly } = useMenuContextHelper();

    const noteGridSelectedCount = contextData?.selectedIds?.length || 0;
    const allSelectedAreTempNotes = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;
    const anySelectedDeleted = contextData?.selectedNotes?.some((note: any) => note.deletedAt !== null && note.deletedAt !== undefined) ?? false;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddNote! })}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add
            </MenuItem>

            <MenuDivider />

            {!anySelectedDeleted && (
                <MenuItem
                    onClick={(e) => openConfirmDialog({ type: "soft-delete", entityType: "note", count: noteGridSelectedCount, allAreTempItems: allSelectedAreTempNotes, onConfirm: contextData?.onSoftDelete!, event: e })}
                >
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {anySelectedDeleted && !allSelectedAreTempNotes && (
                <>
                    <MenuItem
                        onClick={(e) => openConfirmDialog({ type: "hard-delete", entityType: "note", count: noteGridSelectedCount, allAreTempItems: false, onConfirm: contextData?.onHardDelete!, event: e })}
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
