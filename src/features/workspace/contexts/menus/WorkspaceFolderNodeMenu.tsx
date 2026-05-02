import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Plus as AddIcon,
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon,
} from "lucide-react";
import { constants } from "@/shared";
import { useWorkspaceFolderMenuHelper } from "../helpers/useWorkspaceFolderMenu.helper";
import { useWorkspaceStore } from "../../store/Workspace.store";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";

interface FolderDeleteRestoreActionsProps {
    isDirectlyDeleted: boolean;
    hasDeletedAncestor: boolean;
    isMultiple: boolean;
    hasAnyDeletedItem: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDhrItems: (e: any, isHardDelete: boolean) => void;
}

function FolderDeleteRestoreActions({
    isDirectlyDeleted,
    hasDeletedAncestor,
    isMultiple,
    hasAnyDeletedItem,
    onDhrItems,
}: FolderDeleteRestoreActionsProps) {
    if (isDirectlyDeleted) {
        return (
            <>
                {/* //*TẠM THỜI DISABLE VÌ CHƯA TRIỂN KHAI  */}
                {/* <MenuItem onClick={(e) => onDhrItems(e, true)} className="text-red-600 hover:bg-red-50">
                    <HardDeleteIcon className="w-4 h-4 mr-2" />
                    Hard Delete
                </MenuItem> */}
                <MenuItem onClick={(e) => onDhrItems(e, false)}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            </>
        );
    }

    if (!hasDeletedAncestor && !isDirectlyDeleted) {
        return (
            <MenuItem
                onClick={(e) => onDhrItems(e, false)}
                disabled={isMultiple && hasAnyDeletedItem}
            >
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
        );
    }

    return null;
}

/**
 * WorkspaceFolderNodeMenu
 * Context menu for folder nodes in workspace tree
 */
export function WorkspaceFolderNodeMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { selectedItemIds } = useWorkspaceStore();
    const { createFolder, editFolder, dhr_items, createNewNote } = useWorkspaceFolderMenuHelper();
    const _TREESTATUS = useTreeStatusHelper();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxData = contextData as any;
    const entityId = ctxData?.entityId;
    const isWorkspaceRoot = ctxData && entityId < 0;

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(ctxData);

    const addMenuItems = [
        { type: constants.workspace.itemTypes.folder, label: "New Folder", disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
        { type: constants.workspace.itemTypes.note,   label: "New Note",   disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
        { type: constants.workspace.itemTypes.file,   label: "New File",   disabled: true },
    ];

    return (
        <>
            {addMenuItems.map((item) => (
                <MenuItem
                    key={item.type}
                    disabled={item.disabled}
                    onClick={() => {
                        if (item.type === constants.workspace.itemTypes.note) {
                            createNewNote(ctxData);
                        } else if (item.type === constants.workspace.itemTypes.folder) {
                            createFolder(item.type, ctxData);
                        }
                    }}
                >
                    <AddIcon className="w-4 h-4 mr-2" />
                    {item.label}
                </MenuItem>
            ))}

            {!isWorkspaceRoot && (
                <>
                    <MenuDivider />

                    <MenuItem
                        onClick={() => editFolder(ctxData)}
                        disabled={_TREESTATUS.selectedItemStatuses.isMultiple || _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted}
                    >
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit
                    </MenuItem>

                    <FolderDeleteRestoreActions
                        isDirectlyDeleted={_ITEMSTATUS.isDirectlyDeleted}
                        hasDeletedAncestor={_ITEMSTATUS.hasDeletedAncestor}
                        isMultiple={_TREESTATUS.selectedItemStatuses.isMultiple}
                        hasAnyDeletedItem={_TREESTATUS.selectedItemStatuses.hasAnyDeletedItem}
                        onDhrItems={dhr_items}
                    />
                </>
            )}
        </>
    );
}
