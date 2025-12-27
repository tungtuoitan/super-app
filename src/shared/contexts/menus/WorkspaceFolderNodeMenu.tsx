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
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { collectIdsFromTabs, generateTempId, generateUnsavedName } from "@/utils/temp-id.utils";
import { Note } from "@/types/note.types";
import {useAuthStore, useStandardRegistryStore} from "@/store/index";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useWorkspaceOperation } from "@/hooks/workspace/useWorkspaceOperation.helper";
import { Folder } from "@/types/folder.types";
import { NoteItem } from "@/types/workspace.types";

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
    const { selectedFolderIds, currentTree, setCurrentTree } = useWorkspaceStore();
    const { createFolder, editFolder, dhr_items } = useWorkspaceFolderMenuHelper();
    const { openTabs } = useEditorTabsStore();
    const { openTab } = useEditorTabHelper();
    const { $user } = useAuthStore();
    const { registries } = useStandardRegistryStore();
    const { setShouldFocusNoteName } = useNoteDetailStore();
    const { loadTree } = useWorkspaceOperation();

    // Calculate derived values
    const isWorkspaceRoot = contextData && contextData.tagId < 0;
    const isMultipleSelected = selectedFolderIds.length > 1;

    const createNewNote = () => {
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        // Create folder object from contextData
        const parentFolder: Folder | undefined = contextData ? {
            id: contextData.tagId,
            name: contextData.name,
            description: contextData.description,
            color: contextData.color,
            createdAt: new Date(contextData.createdAt),
            isActive: !contextData.isArchived,
        } : undefined;

        const newNote: Note = {
            id: tempId,
            name: name,
            description: "",
            hashtags: [],
            statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
            createdAt: new Date(),
            createdBy: $user.userName,
            userId: $user.userId ?? 0,
            deletedAt: null,
        };

        // Create NoteItem for workspace tree
        const newNoteItem: NoteItem = {
            id: tempId,
            type: constants.workspace.itemTypes.note,
            userId: $user.userId ?? 0,
            name: name,
            parentId: contextData?.tagId || null,
            accessType: "owner",
            isOriginal: true,
            level: (contextData?.level || 0) + 1,
            depth: (contextData?.depth || 0) + 1,
            position: 0,
            sortOrder: 0,
            isExpanded: false,
            isSelected: false,
            createdAt: new Date().toISOString(),
            children: [],
        };

        // Add note to currentTree
        if (currentTree && contextData) {
            const addNoteToTree = (items: any[]): any[] => {
                return items.map(item => {
                    if (item.id === contextData.tagId) {
                        // Found parent folder, add note to its children
                        return {
                            ...item,
                            children: [newNoteItem, ...(item.children || [])]
                        };
                    } else if (item.children && item.children.length > 0) {
                        // Recursively search in children
                        return {
                            ...item,
                            children: addNoteToTree(item.children)
                        };
                    }
                    return item;
                });
            };
            const newTree = {
                ...currentTree,
                items: addNoteToTree(currentTree.items),
                noteCount: currentTree.noteCount + 1
            }
            console.log("New Tree after adding note:", newTree);

            setCurrentTree(newTree);
        }

        // Open tab first
        openTab(newNote);
        
        // Focus on note name field
        setShouldFocusNoteName(true);
    };

    const addMenuItems = [
        { type: constants.workspace.itemTypes.folder, icon: AddIcon, label: "Add Folder", disabled: false },
        { type: constants.workspace.itemTypes.note, icon: NoteIcon, label: "Add Note", disabled: false },
        { type: constants.workspace.itemTypes.file, icon: FileIcon, label: "Add File", disabled: true },
    ];

    return (
        <>
            {/* Add submenu - Create new items */}
            {addMenuItems.map((item) => {
                const Icon = item.icon;
                const handleClick = () => {
                    if (item.type === constants.workspace.itemTypes.note) {
                        createNewNote();
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

            <MenuDivider />

            {/* Edit - disabled if multiple items selected */}
            <MenuItem onClick={() => editFolder(contextData)} disabled={isMultipleSelected}>
                <EditIcon className="w-4 h-4 mr-2" />
                Edit
            </MenuItem>

            {/* Delete/Restore - hidden for workspace root */}
            {!isWorkspaceRoot &&
                (() => {
                    // Check if folder is deleted
                    const isDeleted = contextData && contextData.deletedAt !== null && contextData.deletedAt !== undefined;

                    return isDeleted ? (
                        <>
                            <MenuItem onClick={(e) => dhr_items(e, true)} className="text-red-600 hover:bg-red-50">
                                <HardDeleteIcon className="w-4 h-4 mr-2" />
                                Hard Delete
                            </MenuItem>
                            <MenuItem onClick={(e) => dhr_items(e, false)}>
                                <RestoreIcon className="w-4 h-4 mr-2" />
                                Restore
                            </MenuItem>
                        </>
                    ) : (
                        <MenuItem onClick={(e) => dhr_items(e, false)}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                    );
                })()}
        </>
    );
}
