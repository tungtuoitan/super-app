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
import { useAuthStore, useStandardRegistryStore } from "@/store/index";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useWorkspaceOperation } from "@/hooks/workspace/useWorkspaceOperation.helper";
import { Folder } from "@/types/folder.types";
import { NoteItem } from "@/types/workspace.types";
import { treeMiniHelper } from "@/hooks/workspace/tree.miniHelper";

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
    const { selectedFolderIds, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { createFolder, editFolder, dhr_items } = useWorkspaceFolderMenuHelper();
    const { openTabs } = useEditorTabsStore();
    const { openTab } = useEditorTabHelper();
    const { $user } = useAuthStore();
    const { registries } = useStandardRegistryStore();
    const { setShouldFocusNoteName } = useNoteDetailStore();
    const { loadTree } = useWorkspaceOperation();

    // Calculate derived values
    // Support both V1 (tagId) and V2 (entityId) structure
    const entityId = contextData?.entityId ?? contextData?.tagId;
    const isWorkspaceRoot = contextData && entityId < 0;
    const isMultipleSelected = selectedFolderIds.length > 1;

    // Check deleted status (including inherited from parent)
    const deletedStatus =
        currentWorkspace?.flatData && contextData ? treeMiniHelper.checkDeletedStatus(contextData, currentWorkspace.flatData) : { isDeleted: false, isDirectlyDeleted: false };
    const isDeleted = deletedStatus.isDeleted;
    const isDirectlyDeleted = deletedStatus.isDirectlyDeleted;

    // When multiple selected, check if any item has deletedAt = null (not deleted)
    const hasAnyActiveItem = React.useMemo(() => {
        if (!isMultipleSelected || !currentWorkspace?.flatData) return false;
        
        return selectedFolderIds.some(entityId => {
            // selectedFolderIds contains entityId, need to find by entityId
            const item = currentWorkspace.flatData.find((i: any) => i.entityId === entityId);
            if (!item) return false;
            
            // Check if this item or any ancestor is deleted
            const status = treeMiniHelper.checkDeletedStatus(item, currentWorkspace.flatData);
            return !status.isDeleted; // Return true if item is NOT deleted
        });
    }, [isMultipleSelected, selectedFolderIds, currentWorkspace?.flatData]);

    const createNewNote = () => {
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        // Get entity ID (support both V1 and V2 structure)
        const parentEntityId = contextData?.entityId ?? contextData?.tagId;

        // Create folder object from contextData
        const parentFolder: Folder | undefined = contextData
            ? {
                  id: parentEntityId,
                  name: contextData.name || contextData.data?.name,
                  description: contextData.description || contextData.data?.description,
                  color: contextData.color || contextData.data?.color,
                  createdAt: new Date(contextData.createdAt || contextData.data?.createdAt),
                  isActive: !contextData.isArchived,
              }
            : undefined;

        // Create temporary note (same as useNoteGrid.helper.ts)
        const newNote: Note = {
            id: tempId,
            name: name,
            userId: $user.userId || 0,
            description: "",
            hashtags: [],
            statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
            tags: [],
            type: "idea",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: $user.userName || "Unknown",
            deletedAt: null,
        };

        // Create WorkspaceNoteItem for flat array (WorkspaceItemV2 structure)
        const newWorkspaceItem: any = {
            // WorkspaceItem properties (from workspace_items table)
            id: tempId, // Temporary negative ID (same as note.id)
            workspaceId: currentWorkspace?.id || 1,
            parentId: parentEntityId || null,
            entityType: 3, // 3 = note
            entityId: tempId, // Same as note.id
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            copyInfo: null,
            level: (contextData?.level || 0) + 1,
            position: 0,
            accessType: "owner",
            isOriginal: true,
            isExpanded: false,
            isSelected: false,
            
            // Note entity data (from notes table)
            data: {
                id: tempId,
                userId: $user.userId ?? 0,
                name: name,
                description: "",
                statusCode: registries.find((reg) => reg.type === constants.standardRegistryFE.types.noteStatus)?.code,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
                copyInfo: null,
            },
        };

        // Add note to currentWorkspace.flatData
        if (currentWorkspace && contextData) {
            // Add to flat array at the beginning
            const newFlatData = [newWorkspaceItem, ...currentWorkspace.flatData];
            
            // Also add to tree structure for proper rendering
            const $addNoteToTree = (items: any[]): any[] => {
                return items.map((item) => {
                    // Check both id and entityId for compatibility
                    if (item.id === parentEntityId || item.entityId === parentEntityId) {
                        // Found parent folder, add note to its children
                        return {
                            ...item,
                            children: [newWorkspaceItem, ...(item.children || [])],
                        };
                    } else if (item.children && item.children.length > 0) {
                        // Recursively search in children
                        return {
                            ...item,
                            children: $addNoteToTree(item.children),
                        };
                    }
                    return item;
                });
            };

            const newWorkspace = {
                ...currentWorkspace,
                flatData: newFlatData, // Use the flat array with new item prepended
                noteCount: currentWorkspace.noteCount + 1,
            };
            console.log("✅ New note added to workspace:", { tempId, name, parentEntityId });

            setCurrentWorkspace(newWorkspace);

        }

        // Open tab for editing
        openTab(newNote);

        // Focus on note name field after tab opens
        setShouldFocusNoteName(true);
    };

    const addMenuItems = [
        { type: constants.workspace.itemTypes.folder, icon: AddIcon, label: "Add Folder", disabled: isDeleted || isMultipleSelected },
        { type: constants.workspace.itemTypes.note, icon: NoteIcon, label: "Add Note", disabled: isDeleted || isMultipleSelected },
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

            {/* Only show Edit and Delete options for non-root folders */}
            {!isWorkspaceRoot && (
                <>
                    <MenuDivider />

                    {/* Edit - disabled if multiple items selected or deleted */}
                    <MenuItem onClick={() => editFolder(contextData)} disabled={isMultipleSelected || isDeleted}>
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit
                    </MenuItem>

                    {/* Delete/Restore options */}
                    {(() => {
                        // If item is directly deleted (not inherited), show both Hard Delete and Restore
                        if (isDirectlyDeleted) {
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
                        // else if (isDeleted && !isDirectlyDeleted && !(isMultipleSelected && hasAnyActiveItem)) {
                        //     return (
                        //         <MenuItem onClick={(e) => dhr_items(e, true)} className="text-red-600 hover:bg-red-50">
                        //             <HardDeleteIcon className="w-4 h-4 mr-2" />
                        //             Hard Delete
                        //         </MenuItem>
                        //     );
                        // }
                        // If item is not deleted, show normal Delete option
                        // Disable if multiple selected and any item is still active (deletedAt = null)
                        else if (!isDeleted) {
                            return (
                                <MenuItem onClick={(e) => dhr_items(e, false)} disabled={isMultipleSelected && hasAnyActiveItem}>
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
