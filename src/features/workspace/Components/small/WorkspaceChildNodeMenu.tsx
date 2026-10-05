import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Trash2 as DeleteIcon,
    RotateCcw as RestoreIcon,
    ExternalLink as OpenIcon,
    Copy as CopyIcon,
    Pencil as EditIcon,
} from "lucide-react";
import { useWorkspaceChildMenuHelper } from "../../hooks/useWorkspaceChildMenu.helper";
import { useMenuContext, _isLinkMime } from "@/shared";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { useWorkspaceLinkMenuHelper } from "../../hooks/useWorkspaceLinkMenu.helper";
import { useWorkspaceStore } from "../../store/workspace.store";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";

export function WorkspaceChildNodeMenu() {
    const { contextType, contextData } = useMenuContext();
    const { currentWorkspace } = useWorkspaceStore();
    const _TREESTATUS = useTreeStatusHelper();
    const { deleteItems, editNote } = useWorkspaceChildMenuHelper();
    const { openFileItem, copyFileUrl, editFileItem } = useWorkspaceLinkMenuHelper();

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);
    const isFile = contextType === workspaceConstants.itemTypes.file && contextData?.data;
    const isLink = isFile && _isLinkMime(contextData.data.mimeType);
    const isAlive = !_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted;
    const isMultiple = _TREESTATUS.selectedItemStatuses.isMultiple;

    return (
        <>
            {isFile && (
                <>
                    <MenuItem onClick={() => openFileItem(contextData)} disabled={!contextData.data.url || isMultiple}>
                        <OpenIcon className="w-4 h-4 mr-2" />
                        {isLink ? "Open link" : "Open"}
                    </MenuItem>
                    <MenuItem onClick={() => copyFileUrl(contextData)} disabled={!contextData.data.url || isMultiple}>
                        <CopyIcon className="w-4 h-4 mr-2" />
                        Copy URL
                    </MenuItem>
                    <MenuItem onClick={() => editFileItem(contextData)} disabled={!isAlive || isMultiple}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        {isLink ? "Edit link" : "Rename"}
                    </MenuItem>
                </>
            )}
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
