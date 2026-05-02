import React from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { shellConstants } from "@/shell";
import { useWorkspaceStore } from "../store/workspace.store";
import { useFolderDialogHelper } from "./useFolderDialog.helper";
import { standardRegistryConstants, useMenuContextHelper } from "@/shared";
import { useAuthStore } from "@/shared";
import { useMenuContext } from "@/shared";
import type { ItemType } from "../store/FolderDialog.store";
import { useEditorTabBarHelper } from "@/shell";
import { useNoteDetailStore } from "@/features/note";
import { Note } from "@/features/note";
import { useConsoleHelper } from "@/shared";
import { collectIdsFromTree, generateTempId, generateUnsavedName } from "../utils/temp-id.utils";
import { useWorkspaceFolderDeleteMenuHelper } from "./useWorkspaceFolderDeleteMenu.helper";

export const useWorkspaceFolderMenuHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
    const { openFolderDialog } = useFolderDialogHelper();
    const { openTab } = useEditorTabBarHelper();
    const { setShouldFocusNoteName } = useNoteDetailStore();
    const { dhr_items } = useWorkspaceFolderDeleteMenuHelper();

    const createNewNote = (contextData: any) => {
        const { workspaceItemIds, noteEntityIds } = collectIdsFromTree(currentWorkspace?.flatData || []);
        const tempWorkspaceItemId = generateTempId(workspaceItemIds);
        const tempNoteEntityId = generateTempId(noteEntityIds);
        const name = generateUnsavedName(tempNoteEntityId);
        const parentWorkspaceItemId = contextData?.id ?? null;

        const newNote: Note = {
            id: tempNoteEntityId,
            name: name,
            userId: $user.userId || 0,
            description: "",
            hashtags: "",
            statusCode: standardRegistryConstants.activeStatus.active,
            type: "idea",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: $user.userName || "Unknown",
            deletedAt: null,
        };

        const newWorkspaceItem: any = {
            id: tempWorkspaceItemId,
            workspaceId: currentWorkspace?.id || 1,
            parentId: parentWorkspaceItemId,
            entityType: 3,
            entityId: tempNoteEntityId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            level: (contextData?.level || 0) + 1,
            position: 0,
            accessType: "owner",
            isOriginal: true,
            isExpanded: false,
            isSelected: false,
            data: {
                id: tempNoteEntityId,
                userId: $user.userId ?? 0,
                name: name,
                description: "",
                statusCode: standardRegistryConstants.activeStatus.active,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
            },
        };

        if (currentWorkspace && contextData) {
            setCurrentWorkspace({
                ...currentWorkspace,
                flatData: [newWorkspaceItem, ...currentWorkspace.flatData],
                noteCount: currentWorkspace.noteCount + 1,
            });
        }

        openTab(newNote, shellConstants.vscode.tab.tabTypes.note);
        setShouldFocusNoteName(true);
    };

    const createFolder = (itemType: ItemType, parentTag?: any) => {
        setIsMenuContextOpen(false);
        openFolderDialog("create", itemType, null, parentTag);
    };

    const editFolder = (itemData: any) => {
        setIsMenuContextOpen(false);
        if (itemData) {
            const itemType: ItemType = itemData.type || workspaceConstants.itemTypes.folder;
            openFolderDialog("edit", itemType, itemData, null);
        }
    };

    return {
        createFolder,
        editFolder,
        dhr_items,
        createNewNote,
    };
};
