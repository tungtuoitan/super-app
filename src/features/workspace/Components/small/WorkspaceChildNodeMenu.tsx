import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Trash2 as DeleteIcon,
    RotateCcw as RestoreIcon,
} from "lucide-react";
import { useWorkspaceChildMenuHelper } from "../../hooks/useWorkspaceChildMenu.helper";
import { useMenuContext } from "@/shared";
import { useWorkspaceStore } from "../../store/workspace.store";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";

export function WorkspaceChildNodeMenu() {
    const { contextType, contextData } = useMenuContext();
    const { currentWorkspace } = useWorkspaceStore();
    const _TREESTATUS = useTreeStatusHelper();
    const { deleteItems, editNote } = useWorkspaceChildMenuHelper();

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);

    return (
        <>
            <MenuDivider />

            {(() => {
                if (_ITEMSTATUS.isDirectlyDeleted) {
                    return (
                        <MenuItem onClick={(e) => deleteItems(e, false)}>
                            <RestoreIcon className="w-4 h-4 mr-2" />
                            Restore
                        </MenuItem>
                    );
                }
                if (!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted) {
                    return (
                        <MenuItem onClick={(e) => deleteItems(e, false)} disabled={_TREESTATUS.selectedItemStatuses.isMultiple && _TREESTATUS.selectedItemStatuses.hasDeletedAncestor}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                    );
                }
                return null;
            })()}
        </>
    );
}
