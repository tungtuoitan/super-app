import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    Info as InfoIcon,
    File as FileIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon,
} from "lucide-react";
import { useWorkspaceChildMenuHelper } from "../helpers/useWorkspaceChildMenu.helper";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useWorkspaceStore } from "../../store/Workspace.store";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";

/**
 * WorkspaceChildNodeMenu
 * Context menu for note and file nodes in workspace explorer tree
 *
 * Features:
 * - Note: Edit, View Details, Delete, Hard Delete
 * - File: View Details, Download (disabled), Delete, Hard Delete
 */
export function WorkspaceChildNodeMenu() {
    const { contextType, contextData } = useOrchestratorContextMenuStore();
    const { currentWorkspace } = useWorkspaceStore();
    const _TREESTATUS = useTreeStatusHelper();

    const { deleteItems, editNote } = useWorkspaceChildMenuHelper();

    // Check deleted status (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);
    const isNote = contextType === "note";

    return (
        <>
            {/* CHILD K CẦN OPTION EDIT */}
            {/* {isNote && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => editNote(contextData)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple || _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit
                    </MenuItem>
                </>
            )} */}

            <MenuDivider />

            {/* Delete/Restore - Shared */}
            {(() => {
                // If item is directly deleted (not inherited), show both Hard Delete and Restore
                if (_ITEMSTATUS.isDirectlyDeleted) {
                    return (
                        <>
                            {/* //*TẠM THỜI DISABLE VÌ CHƯA TRIỂN KHAI  */}
                            {/* <MenuItem onClick={(e) => deleteItems(e, true)} className="text-red-600 hover:bg-red-50">
                                <HardDeleteIcon className="w-4 h-4 mr-2" />
                                Hard Delete
                            </MenuItem> */}
                            <MenuItem onClick={(e) => deleteItems(e, false)}>
                                <RestoreIcon className="w-4 h-4 mr-2" />
                                Restore
                            </MenuItem>
                        </>
                    );
                }
                // If item is deleted but not directly (inherited from parent), only show Hard Delete
                // Don't show if multiple selected and any item is still active
                //* TẠM THỜI ẨN VÌ CHƯA TRIỂN KHAI
                // else if (_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted && !(_TREESTATUS.selectedItemStatuses.isMultiple && _TREESTATUS.selectedItemStatuses.hasAnyNormalItem)) {
                //     return (
                //         <MenuItem onClick={(e) => deleteItems(e, true)} className="text-red-600 hover:bg-red-50">
                //             <HardDeleteIcon className="w-4 h-4 mr-2" />
                //             Hard Delete
                //         </MenuItem>
                //     );
                // }
                // If item is not deleted, show normal Delete option
                // Disable if multiple selected and any item is still active (deletedAt = null)
                else if (!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted) {
                    return (
                        <MenuItem onClick={(e) => deleteItems(e, false)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple && _TREESTATUS.selectedItemStatuses.hasDeletedAncestor}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                    );
                }
                // Don't show anything if conditions don't match
                return null;
            })()}
        </>
    );
}
