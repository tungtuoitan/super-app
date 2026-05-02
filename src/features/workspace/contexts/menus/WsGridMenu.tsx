import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, AlertTriangle as HardDeleteIcon, RotateCcw as RestoreIcon } from "lucide-react";
import { useWsGridMenuHelper } from "../helpers/useWsGridMenu.helper";

export function WsGridMenu() {
    const { selectedCount, allAreTempWorkspaces, anySelectedDeleted, addWorkspace, softDelete, hardDelete, restore } = useWsGridMenuHelper();

    return (
        <>
            <MenuItem onClick={addWorkspace}>
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

            {anySelectedDeleted && !allAreTempWorkspaces && (
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
