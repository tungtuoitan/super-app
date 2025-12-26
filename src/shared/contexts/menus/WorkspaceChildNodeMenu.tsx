import React from 'react';
import { MenuItem, MenuDivider } from '@szhsin/react-menu';
import {
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    Info as InfoIcon,
    File as FileIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon
} from 'lucide-react';
import { useWorkspaceChildMenuHelper } from '@/shared/contexts/helpers/useWorkspaceChildMenu.helper';
import {useOrchestratorContextMenuStore} from '@/store/contextMenu/ContextMenu.store';

/**
 * WorkspaceChildNodeMenu
 * Context menu for note and file nodes in workspace explorer tree
 * 
 * Features:
 * - Note: Edit, View Details, Delete, Hard Delete
 * - File: View Details, Download (disabled), Delete, Hard Delete
 */
export function WorkspaceChildNodeMenu() {
    const { contextType, contextData } = useOrchestratorContextMenuStore();
    
    const {
        deleteItems,
    } = useWorkspaceChildMenuHelper();

    return (
        <>
            <MenuDivider />

            {/* Delete/Restore - Shared */}
            {(() => {
                // Check if item is deleted (note or file)
                const isDeleted = contextData && contextData.deletedAt !== null && contextData.deletedAt !== undefined;

                return isDeleted ? (
                    <>
                        <MenuItem
                            onClick={(e) => deleteItems(e, true)}
                            className="text-red-600 hover:bg-red-50"
                        >
                            <HardDeleteIcon className="w-4 h-4 mr-2" />
                            Hard Delete
                        </MenuItem>
                        <MenuItem onClick={(e) => deleteItems(e, false)}>
                            <RestoreIcon className="w-4 h-4 mr-2" />
                            Restore
                        </MenuItem>
                    </>
                ) : (
                    <MenuItem onClick={(e) => deleteItems(e, false)}>
                        <DeleteIcon className="w-4 h-4 mr-2" />
                        Delete
                    </MenuItem>
                );
            })()}
        </>
    );
}
