import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, AlertTriangle as HardDeleteIcon } from "lucide-react";
import { useWsGridMenuHelper } from "@/shared/contexts/helpers/useWsGridMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";

/**
 * WsGridMenu
 * Context menu for workspace grid/table view
 *
 * Features:
 * - Add new workspace
 * - Delete selected workspaces (single or bulk)
 * - Hard delete (permanent, cascade all contents)
 */
export function WsGridMenu() {
    const { handleDelete } = useWsGridMenuHelper();

    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();

    const wsGridHasSelection = (contextData?.selectedIds?.length || 0) > 0;

    return (
        <>
            {/* Add Workspace */}
            <MenuItem
                onClick={() => {
                    setIsContextMenuOpen(false);
                    contextData?.addWorkspace();
                }}
            >
                <AddIcon className="w-4 h-4 mr-2" />
                Add Workspace
            </MenuItem>

            <MenuDivider />

            {/* Soft Delete */}
            <MenuItem onClick={(e) => handleDelete(e, false)} disabled={!wsGridHasSelection}>
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>

            {/* Hard Delete */}
            <MenuItem onClick={(e) => handleDelete(e, true)} className="text-red-600 hover:bg-red-50" disabled={!wsGridHasSelection}>
                <HardDeleteIcon className="w-4 h-4 mr-2" />
                Hard Delete
            </MenuItem>
        </>
    );
}
