import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, AlertTriangle as HardDeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useNoteGridMenuHelper } from "../helpers/useNoteGridMenu.helper";

export function NoteGridMenu() {
    const { selectedCount, allAreTempNotes, anySelectedDeleted, addNote, softDelete, hardDelete, restore } = useNoteGridMenuHelper();

    return (
        <>
            <MenuItem onClick={addNote}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add
            </MenuItem>

            <MenuDivider />

            {!anySelectedDeleted && (
                <MenuItem onClick={(e: any) => softDelete((e.syntheticEvent?.target ?? e.target) as HTMLElement)}>
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {anySelectedDeleted && !allAreTempNotes && (
                <>
                    <MenuItem
                        onClick={(e: any) => hardDelete((e.syntheticEvent?.target ?? e.target) as HTMLElement)}
                        className="text-red-600 hover:bg-red-50"
                    >
                        <HardDeleteIcon className="w-4 h-4 mr-2" />
                        Hard Delete
                    </MenuItem>
                    <MenuItem onClick={restore}>
                        <RestoreIcon className="w-4 h-4 mr-2" />
                        Restore
                    </MenuItem>
                </>
            )}
        </>
    );
}
