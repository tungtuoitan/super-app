import React from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Plus as AddIcon,
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    RotateCcw as RestoreIcon,
} from "lucide-react";
import { constants } from "@/shared";
import { useWorkspaceFolderMenuHelper } from "../../hooks/useWorkspaceFolderMenu.helper";
import { useWorkspaceStore } from "../../store/workspace.store";
import { useMenuContext } from "@/shared";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";

export function WorkspaceFolderNodeMenu() {
    const { contextData } = useMenuContext();
    const { selectedItemIds } = useWorkspaceStore();
    const { createFolder, editFolder, dhr_items, createNewNote } = useWorkspaceFolderMenuHelper();
    const _TREESTATUS = useTreeStatusHelper();

    const entityId = contextData?.entityId;
    const isWorkspaceRoot = contextData && entityId < 0;
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);

    const addMenuItems = [
        { type: workspaceConstants.itemTypes.folder, icon: AddIcon, label: "New Folder", disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
        { type: workspaceConstants.itemTypes.note, icon: AddIcon, label: "New Note", disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
        { type: workspaceConstants.itemTypes.file, icon: AddIcon, label: "New File", disabled: true },
    ];

    return (
        <>
            {addMenuItems.map((item) => {
                const Icon = item.icon;
                const handleClick = () => {
                    if (item.type === workspaceConstants.itemTypes.note) {
                        createNewNote(contextData);
                    } else if (item.type === workspaceConstants.itemTypes.folder) {
                        createFolder(item.type, contextData);
                    }
                };
                return (
                    <MenuItem key={item.type} onClick={handleClick} disabled={item.disabled}>
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                    </MenuItem>
                );
            })}

            {!isWorkspaceRoot && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => editFolder(contextData)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple || _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit
                    </MenuItem>

                    {(() => {
                        if (_ITEMSTATUS.isDirectlyDeleted) {
                            return (
                                <MenuItem onClick={(e) => dhr_items(e, false)}>
                                    <RestoreIcon className="w-4 h-4 mr-2" />
                                    Restore
                                </MenuItem>
                            );
                        }
                        if (!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted) {
                            return (
                                <MenuItem onClick={(e) => dhr_items(e, false)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple && _TREESTATUS.selectedItemStatuses.hasAnyDeletedItem}>
                                    <DeleteIcon className="w-4 h-4 mr-2" />
                                    Delete
                                </MenuItem>
                            );
                        }
                        return null;
                    })()}
                </>
            )}
        </>
    );
}
