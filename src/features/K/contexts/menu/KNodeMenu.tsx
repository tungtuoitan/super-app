import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Plus as AddIcon,
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon,
    FileCode as ImportMarkdownIcon,
} from "lucide-react";
import { useKStore } from "../../store/K.store";
import { useKMenuHelper } from "../helpers/useKMenu.helper";
import { useKTreeStatusHelper } from "../../hooks/kTree/useKTreeStatusHelper";
import { useKTabHelper } from "../../hooks/useKTab.helper";
import { kconstants } from "../../utils/K.Constants";
import {useMenuContext} from "@/shared";

/**
 * WorkspaceFolderNodeMenu
 * Context menu for folder nodes in workspace workspace tree
 *
 * Menu Items:
 * - Add Folder/File/Note (submenu)
 * - Edit (rename folder)
 * - Delete / Hard Delete
 */
export function KNodeMenu() {
    const { contextData } = useMenuContext();
    const { selectedItemIds, currentK, allK, setPendingImportNodeId } = useKStore();
    const { createFolder, editFolder, dhr_items } = useKMenuHelper();
    const { openKnowledgeTab } = useKTabHelper();
    const _TREESTATUS = useKTreeStatusHelper();

    // Calculate derived values
    const entityId = contextData?.entityId
    const isWorkspaceRoot = contextData && entityId < 0;

    // Check deleted status (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData)

    const addMenuItems = [
        { type: kconstants.workspace.itemTypes.folder, icon: AddIcon, label: "New Card", disabled: _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted || _TREESTATUS.selectedItemStatuses.isMultiple },
    ];

    const handleImportMarkdown = () => {
        // Store the target parent node in KStore so KKnowledgeEditorPanel can read it even if not yet mounted
        setPendingImportNodeId(contextData?.id ?? null);
        // Ensure the knowledge tab is open
        const ks = allK.find(k => k.id === currentK?.id);
        if (ks) openKnowledgeTab(ks);
    };

    return (
        <>
            {/* Add submenu - Create new items */}
            {addMenuItems.map((item) => {
                const Icon = item.icon;
                const handleClick = () => {
                    if (item.type === kconstants.workspace.itemTypes.folder) {
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

                    {/* Edit - disabled if multiple items selected or deleted */}
                    <MenuItem onClick={() => editFolder(contextData)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple || _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit
                    </MenuItem>

                    {/* Import from Markdown */}
                    <MenuItem onClick={handleImportMarkdown} disabled={_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted}>
                        <ImportMarkdownIcon className="w-4 h-4 mr-2" />
                        Import từ Markdown
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
