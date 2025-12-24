import React from 'react';
import { MenuItem, MenuDivider } from '@szhsin/react-menu';
import {
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    Info as InfoIcon,
    File as FileIcon,
    AlertTriangle as HardDeleteIcon
} from 'lucide-react';
import { useWorkspaceChildMenuHelper } from '@/shared/contexts/helpers/useWorkspaceChildMenu.helper';
import { constants } from '@/utils/constants';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';

/**
 * WorkspaceChildNodeMenu
 * Context menu for note and file nodes in workspace explorer tree
 * 
 * Features:
 * - Note: Edit, View Details, Delete, Hard Delete
 * - File: View Details, Download (disabled), Delete, Hard Delete
 */
export function WorkspaceChildNodeMenu() {
    const { contextType } = useContextMenuStore();
    const {
        handleEditItem,
        handleViewInfo,
        onDeleteItemClick,
    } = useWorkspaceChildMenuHelper();

    const isNote = contextType === constants.workspace.itemTypes.note;
    const isFile = contextType === constants.workspace.itemTypes.file;

    return (
        <>
            {/* Edit - Only for notes */}
            {isNote && (
                <MenuItem onClick={handleEditItem}>
                    <EditIcon className="w-4 h-4 mr-2" />
                    Edit
                </MenuItem>
            )}
            
            {/* View Details - Shared */}
            <MenuItem onClick={handleViewInfo}>
                <InfoIcon className="w-4 h-4 mr-2" />
                View Details
            </MenuItem>
            
            {/* Download - Only for files (disabled) */}
            {isFile && (
                <MenuItem onClick={handleViewInfo} disabled>
                    <FileIcon className="w-4 h-4 mr-2" />
                    Download
                </MenuItem>
            )}
            
            <MenuDivider />
            
            {/* Delete - Shared */}
            <MenuItem onClick={(e) => onDeleteItemClick(e, false)}>
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
            
            {/* Hard Delete - Shared */}
            <MenuItem
                onClick={(e) => onDeleteItemClick(e, true)}
                className="text-red-600 hover:bg-red-50"
            >
                <HardDeleteIcon className="w-4 h-4 mr-2" />
                Hard Delete
            </MenuItem>
        </>
    );
}
