import React from 'react';
import { MenuItem, MenuDivider } from '@szhsin/react-menu';
import {
    Plus as AddIcon,
    Edit as EditIcon,
    Trash2 as DeleteIcon,
    File as FileIcon,
    FileText as NoteIcon,
    AlertTriangle as HardDeleteIcon,
    RotateCcw as RestoreIcon
} from 'lucide-react';
import { constants } from '@/utils/constants';
import { useWorkspaceFolderMenuHelper } from '@/shared/contexts/helpers/useWorkspaceFolderMenu.helper';
import { useExplorerStore } from '@/store/explorer/Explorer.store';
import {useOrchestratorContextMenuStore} from '@/store/contextMenu/ContextMenu.store';

/**
 * WorkspaceFolderNodeMenu
 * Context menu for folder nodes in workspace explorer tree
 * 
 * Menu Items:
 * - Add Folder/File/Note (submenu)
 * - Edit (rename folder)
 * - Delete / Hard Delete
 */
export function WorkspaceFolderNodeMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { selectedFolderIds } = useExplorerStore();
    const {
        createItem,
        editItem,
        deleteItems,
    } = useWorkspaceFolderMenuHelper();

    // Calculate derived values
    const isWorkspaceRoot = contextData && contextData.tagId < 0;

    const addMenuItems = [
        { type: constants.workspace.itemTypes.folder, icon: AddIcon, label: 'Add Folder', disabled: false },
        { type: constants.workspace.itemTypes.file, icon: FileIcon, label: 'Add File', disabled: true },
        { type: constants.workspace.itemTypes.note, icon: NoteIcon, label: 'Add Note', disabled: false },
    ];

    return (
        <>
            {/* Add submenu - Create new items */}
            {addMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                    <MenuItem 
                        key={item.type}
                        onClick={() => createItem(item.type, contextData)} 
                        disabled={item.disabled}
                    >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                    </MenuItem>
                );
            })}
            
            <MenuDivider />
            
            {/* Delete/Restore - hidden for workspace root */}
            {!isWorkspaceRoot && (() => {
                // Check if folder is deleted
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
