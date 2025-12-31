import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Plus as AddIcon,
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    File as FileIcon,
    FileText as NoteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon,
} from "lucide-react";
import { constants } from "@/utils/constants";
import { useWorkspaceFolderMenuHelper } from "@/shared/contexts/helpers/useWorkspaceFolderMenu.helper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";

/**
 * WorkspaceFolderNodeMenu
 * Context menu for folder nodes in workspace workspace tree
 *
 * Menu Items:
 * - Add Folder/File/Note (submenu)
 * - Edit (rename folder)
 * - Delete / Hard Delete
 */
export function WorkspaceFolderNodeMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { selectedItemIds, currentWorkspace } = useWorkspaceStore();
    const { createFolder, editFolder, dhr_items, createNewNote, openAddExistingNotePopup } = useWorkspaceFolderMenuHelper();
    const _TREESTATUS = useTreeStatusHelper();

    // Calculate derived values
    const entityId = contextData?.entityId
    const isWorkspaceRoot = contextData && entityId < 0;

    // Check deleted status (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData)
    
    const addMenuItems = [
        { type: constants.workspace.itemTypes.folder, icon: AddIcon, label: "New Folder", disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
        { type: constants.workspace.itemTypes.note, icon: AddIcon, label: "New Note", disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
        { type: constants.workspace.itemTypes.file, icon: AddIcon, label: "New File", disabled: true },
    ];

    return (
        <>
            {/* Add submenu - Create new items */}
            {addMenuItems.map((item) => {
                const Icon = item.icon;
                const handleClick = () => {
                    if (item.type === constants.workspace.itemTypes.note) {
                        createNewNote(contextData);
                    } else if (item.type === constants.workspace.itemTypes.folder) {
                        createFolder(item.type, contextData);
                    }
                    // Other types not implemented yet
                };
                return (
                    <MenuItem key={item.type} onClick={handleClick} disabled={item.disabled}>
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                    </MenuItem>
                );
            })}

            {/* Only show Edit and Delete options for non-root folders */}
            {!isWorkspaceRoot && (
                <>
                    <MenuDivider />

                    {/* Add Existing Note */}
                    <MenuItem onClick={() => openAddExistingNotePopup(contextData)} disabled={_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple}>
                        <AddIcon className="w-4 h-4 mr-2" />
                        Existing Note
                    </MenuItem>

                    <MenuDivider />

                    {/* Edit - disabled if multiple items selected or deleted */}
                    <MenuItem onClick={() => editFolder(contextData)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple || _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit
                    </MenuItem>

                    {/* Delete/Restore options */}
                    {(() => {
                        // If item is directly deleted (not inherited), show both Hard Delete and Restore
                        if (_ITEMSTATUS.isDirectlyDeleted) {
                            return (
                                <>
                                    {/* //*TẠM THỜI DISABLE VÌ CHƯA TRIỂN KHAI  */}
                                    {/* <MenuItem onClick={(e) => dhr_items(e, true)} className="text-red-600 hover:bg-red-50">
                                    <HardDeleteIcon className="w-4 h-4 mr-2" />
                                    Hard Delete
                                </MenuItem> */}
                                    <MenuItem onClick={(e) => dhr_items(e, false)}>
                                        <RestoreIcon className="w-4 h-4 mr-2" />
                                        Restore
                                    </MenuItem>
                                </>
                            );
                        }
                        // If item is deleted but not directly (inherited from parent), only show Hard Delete
                        // Don't show if multiple selected and any item is still active
                        //* TẠM THỜI ẨN VÌ CHƯA TRIỂN KHAI
                        // else if (isDeleted && !isDirectlyDeleted && !(isMultipleSelected && hasAnyNormalItem)) {
                        //     return (
                        //         <MenuItem onClick={(e) => dhr_items(e, true)} className="text-red-600 hover:bg-red-50">
                        //             <HardDeleteIcon className="w-4 h-4 mr-2" />
                        //             Hard Delete
                        //         </MenuItem>
                        //     );
                        // }
                        // If item is not deleted, show normal Delete option
                        // Disable if multiple selected and any item is still active (deletedAt = null)
                        
                        else if (!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted) {
                            return (
                                <MenuItem onClick={(e) => dhr_items(e, false)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple && _TREESTATUS.selectedItemStatuses.hasAnyDeletedItem}>
                                    <DeleteIcon className="w-4 h-4 mr-2" />
                                    Delete
                                </MenuItem>
                            );
                        }
                        // Don't show anything if conditions don't match
                        return null;
                    })()}
                </>
            )}
        </>
    );
}
