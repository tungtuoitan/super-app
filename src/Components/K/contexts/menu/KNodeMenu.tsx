import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Plus as AddIcon,
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon,
    CornerDownRight as ShortcutIcon,
} from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import {useKStore} from "../../store/K.store";
import {useKMenuHelper} from "../helpers/useKMenu.helper";
import {useKTreeStatusHelper} from "../../hooks/useKTreeStatusHelper";
import {kconstants} from "../../utils/K.Constants";
import {useKShortcutDialogHelper} from "../../hooks/useKShortcutDialog.helper";

/**
 * KNodeMenu
 * Context menu for nodes in the K knowledge tree.
 *
 * Shortcut nodes behave differently from regular nodes:
 *   - "New Card" is hidden (children belong to the original)
 *   - "Edit"    → labelled "Edit Original" (writes through to the source node)
 *   - "Delete"  → replaced by "Remove Shortcut" (hard-deletes the shortcut row only)
 *
 * "Add Shortcut here" mở VSPanel shortcut tab, khóa parentNode = node đang right-click.
 */
export function KNodeMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { selectedItemIds, currentK } = useKStore();
    const { createFolder, editFolder, dhr_items, deleteShortcut } = useKMenuHelper();
    const { openShortcutDialog } = useKShortcutDialogHelper();
    const _TREESTATUS = useKTreeStatusHelper();

    const entityId        = contextData?.entityId;
    const isWorkspaceRoot = contextData && entityId < 0;
    const isShortcut      = contextData?.typeCode === "shortcut";

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);

    return (
        <>
            {/* ── New Card — hidden for shortcuts ── */}
            {!isShortcut && (
                <MenuItem
                    onClick={() => createFolder(kconstants.workspace.itemTypes.folder, contextData)}
                    disabled={
                        _ITEMSTATUS.hasDeletedAncestor ||
                        _ITEMSTATUS.isDirectlyDeleted   ||
                        _TREESTATUS.selectedItemStatuses.isMultiple
                    }
                >
                    <AddIcon className="w-4 h-4 mr-2" />
                    New Card
                </MenuItem>
            )}

            {/* ── Add Shortcut here — hidden for workspace root only ── */}
            {!isWorkspaceRoot && (
                <MenuItem
                    onClick={() => openShortcutDialog(contextData)}
                    disabled={
                        _ITEMSTATUS.hasDeletedAncestor ||
                        _ITEMSTATUS.isDirectlyDeleted   ||
                        _TREESTATUS.selectedItemStatuses.isMultiple
                    }
                >
                    <ShortcutIcon className="w-4 h-4 mr-2 text-indigo-400" />
                    Add Shortcut here
                </MenuItem>
            )}

            {/* ── Edit / Delete — only for non-root ── */}
            {!isWorkspaceRoot && (
                <>
                    {!isShortcut && <MenuDivider />}

                    {/* Edit — for shortcuts this edits the original node */}
                    <MenuItem
                        onClick={() => editFolder(contextData)}
                        disabled={
                            _TREESTATUS.selectedItemStatuses.isMultiple ||
                            _ITEMSTATUS.hasDeletedAncestor              ||
                            _ITEMSTATUS.isDirectlyDeleted
                        }
                    >
                        <EditIcon className="w-4 h-4 mr-2" />
                        {isShortcut ? "Edit Original" : "Edit"}
                    </MenuItem>

                    {/* ── SHORTCUT: Remove Shortcut (hard-delete row) ── */}
                    {isShortcut ? (
                        <MenuItem onClick={(e) => deleteShortcut(e)} className="text-red-500">
                            <ShortcutIcon className="w-4 h-4 mr-2" />
                            Remove Shortcut
                        </MenuItem>
                    ) : (
                        /* ── REGULAR NODE: Soft-delete / Restore ── */
                        (() => {
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
                                    <MenuItem
                                        onClick={(e) => dhr_items(e, false)}
                                        disabled={
                                            _TREESTATUS.selectedItemStatuses.isMultiple &&
                                            _TREESTATUS.selectedItemStatuses.hasAnyDeletedItem
                                        }
                                    >
                                        <DeleteIcon className="w-4 h-4 mr-2" />
                                        Delete
                                    </MenuItem>
                                );
                            }
                            return null;
                        })()
                    )}
                </>
            )}
        </>
    );
}
