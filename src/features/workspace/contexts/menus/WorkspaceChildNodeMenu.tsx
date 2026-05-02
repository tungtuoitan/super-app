import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Trash2 as DeleteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon,
} from "lucide-react";
import { useWorkspaceChildMenuHelper } from "../helpers/useWorkspaceChildMenu.helper";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";

interface ChildDeleteRestoreActionsProps {
    isDirectlyDeleted: boolean;
    hasDeletedAncestor: boolean;
    isMultiple: boolean;
    hasDeletedAncestorInSelection: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDeleteItems: (e: any, isHardDelete: boolean) => void;
}

function ChildDeleteRestoreActions({
    isDirectlyDeleted,
    hasDeletedAncestor,
    isMultiple,
    hasDeletedAncestorInSelection,
    onDeleteItems,
}: ChildDeleteRestoreActionsProps) {
    if (isDirectlyDeleted) {
        return (
            <>
                {/* //*TẠM THỜI DISABLE VÌ CHƯA TRIỂN KHAI  */}
                {/* <MenuItem onClick={(e) => onDeleteItems(e, true)} className="text-red-600 hover:bg-red-50">
                    <HardDeleteIcon className="w-4 h-4 mr-2" />
                    Hard Delete
                </MenuItem> */}
                <MenuItem onClick={(e) => onDeleteItems(e, false)}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            </>
        );
    }

    if (!hasDeletedAncestor && !isDirectlyDeleted) {
        return (
            <MenuItem
                onClick={(e) => onDeleteItems(e, false)}
                disabled={isMultiple && hasDeletedAncestorInSelection}
            >
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
        );
    }

    return null;
}

/**
 * WorkspaceChildNodeMenu
 * Context menu for note and file nodes in workspace explorer tree
 */
export function WorkspaceChildNodeMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const _TREESTATUS = useTreeStatusHelper();
    const { deleteItems } = useWorkspaceChildMenuHelper();

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData as any);

    return (
        <>
            <MenuDivider />

            <ChildDeleteRestoreActions
                isDirectlyDeleted={_ITEMSTATUS.isDirectlyDeleted}
                hasDeletedAncestor={_ITEMSTATUS.hasDeletedAncestor}
                isMultiple={_TREESTATUS.selectedItemStatuses.isMultiple}
                hasDeletedAncestorInSelection={_TREESTATUS.selectedItemStatuses.hasDeletedAncestor}
                onDeleteItems={deleteItems}
            />
        </>
    );
}
