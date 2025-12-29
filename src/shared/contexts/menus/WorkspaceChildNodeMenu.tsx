import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Edit as EditIcon, Trash2 as DeleteIcon, Info as InfoIcon, File as FileIcon, AlertTriangle as HardDeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useWorkspaceChildMenuHelper } from "@/shared/contexts/helpers/useWorkspaceChildMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";

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

    const { deleteItems } = useWorkspaceChildMenuHelper();

    // Check deleted status (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);

    return (
        <>
            <MenuDivider />

            {/* Delete/Restore - Shared */}
            {(() => {
                // If item is directly deleted (not inherited), show both Hard Delete and Restore
                if (_ITEMSTATUS.isDirectlyDeleted) {
                    return (
                        <>
                            <MenuItem onClick={(e) => deleteItems(e, true)} className="text-red-600 hover:bg-red-50">
                                <HardDeleteIcon className="w-4 h-4 mr-2" />
                                Hard Delete
                            </MenuItem>
                            <MenuItem onClick={(e) => deleteItems(e, false)}>
                                <RestoreIcon className="w-4 h-4 mr-2" />
                                Restore
                            </MenuItem>
                        </>
                    );
                }
                // If item is deleted but not directly (inherited from parent), only show Hard Delete
                else if (_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted) {
                    return (
                        <MenuItem onClick={(e) => deleteItems(e, true)} className="text-red-600 hover:bg-red-50">
                            <HardDeleteIcon className="w-4 h-4 mr-2" />
                            Hard Delete
                        </MenuItem>
                    );
                }
                // If item is not deleted, show normal Delete option
                else {
                    return (
                        <MenuItem onClick={(e) => deleteItems(e, false)}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                    );
                }
            })()}
        </>
    );
}
