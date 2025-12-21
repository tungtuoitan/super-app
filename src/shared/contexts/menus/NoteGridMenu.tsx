import React from 'react';
import { MenuItem, MenuDivider } from '@szhsin/react-menu';
import { 
    Plus as AddIcon, 
    Trash2 as DeleteIcon, 
    AlertTriangle as HardDeleteIcon
} from 'lucide-react';
import { useNoteGridMenuHelper } from '@/shared/contexts/helpers/useNoteGridMenu.helper';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';

/**
 * NoteGridMenu
 * Context menu for note grid/table view
 * 
 * Features:
 * - Add new note
 * - Delete selected notes (single or bulk)
 * - Hard delete (permanent)
 */
export function NoteGridMenu() {
    const { contextData } = useContextMenuStore();
    const { handleAddNote, handleDelete } = useNoteGridMenuHelper();

    // Calculate derived values from contextData
    const noteGridSelectedCount = contextData?.selectedIds?.length || 0;
    const noteGridIsMultiple = noteGridSelectedCount > 1;
    const allSelectedAreTempNotes = contextData?.selectedIds?.every((id: number) => id < 0) ?? false;

    return (
        <>
            {/* Add Note */}
            <MenuItem onClick={handleAddNote}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add
            </MenuItem>
            
            <MenuDivider />
            
            {/* Soft Delete */}
            <MenuItem onClick={(e) => handleDelete(e, false)}>
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
            
            {/* Hard Delete - Only show if not all selected notes are temporary */}
            {!allSelectedAreTempNotes && (
                <MenuItem 
                    onClick={(e) => handleDelete(e, true)}
                    className="text-red-600 hover:bg-red-50"
                >
                    <HardDeleteIcon className="w-4 h-4 mr-2" />
                    Hard Delete
                </MenuItem>
            )}
        </>
    );
}
