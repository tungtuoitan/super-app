/**
 * Task Workspace Item Helper
 * Functions only â€” managing notes linked to a task via workspace folder.
 * State lives in useTaskStore.
 */


import { standardRegistryConstants, useAuthStore } from "@/shared";
import { shellConstants } from "@/shell";
import type { Note } from "@/features/note";
import { type Task } from "../types/task.types";
import { type TaskFolderItem } from "../types/taskDetail.types";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { useNoteDetailStore } from "@/features/note";
import { constants } from "@/shared";
import { generateTempId, generateUnsavedName, workspaceService } from "@/features/workspace";
import { WorkspaceNoteItem, WorkspaceFileItem } from "@/features/workspace";
import { useEditorTabHelper } from "@/shell";
import {useEditorTabBarStore} from "@/shell";

export const useTaskWorkspaceItemHelper = () => {
    const { $user } = useAuthStore();
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabBarStore();
    const { setShouldFocusNoteName } = useNoteDetailStore();
    const { openTab } = useEditorTabHelper();
    const { setFolderItems, setIsLoadingFolderItems } = useTaskDetailStore();

    /**
     * Load notes/files inside the task's workspace folder.
     */
    const loadFolderItems = async (task: Task, projectWorkspaceId: number) => {
        if (!task.folderWorkspaceItemId || !projectWorkspaceId) {
            setFolderItems([]);
            return;
        }

        setIsLoadingFolderItems(true);
        try {
            const token = $user.userToken ?? "";
            const result = await workspaceService._getWorkspaceTreeV2(token, projectWorkspaceId);
            if (!result.success || !result.object?.flatData) {
                setFolderItems([]);
                return;
            }

            const children = result.object.flatData.filter(
                (item) =>
                    item.parentId === task.folderWorkspaceItemId &&
                    (item.entityType === 3 || item.entityType === 4) &&
                    !item.deletedAt
            ) as (WorkspaceNoteItem | WorkspaceFileItem)[];

            setFolderItems(children.map((item) => ({
                workspaceItemId: item.id,
                entityId: item.entityId,
                entityType: item.entityType,
                name: item.data.name,
                noteData: item.entityType === 3 ? (item as WorkspaceNoteItem).data : undefined,
            })));
        } catch {
            setFolderItems([]);
        } finally {
            setIsLoadingFolderItems(false);
        }
    }

    /**
     * Open a note from the task's folder in an editor tab.
     */
    const openFolderItem = (item: TaskFolderItem) => {
        if (item.entityType !== 3 || !item.noteData) return;
        const note: Note = {
            id: item.entityId,
            name: item.noteData.name,
            userId: item.noteData.userId,
            description: item.noteData.description ?? "",
            hashtags: "",
            statusCode: item.noteData.statusCode,
            icon: item.noteData.icon,
            color: item.noteData.color,
            createdAt: item.noteData.createdAt ? new Date(item.noteData.createdAt) : new Date(),
            updatedAt: item.noteData.updatedAt ? new Date(item.noteData.updatedAt) : undefined,
            deletedAt: item.noteData.deletedAt ? new Date(item.noteData.deletedAt) : null,
        };
        openTab(note, shellConstants.vscode.tab.tabTypes.note);
    }

    /**
     * Create a new note for a task.
     * Opens a bare note tab. On save, upsertOrchestraitor will place the note
     * inside the task's workspace folder via parentId.
     */
    const createTaskNote = (task: Task) => {
        const existingIds = openTabs
            .filter((t) => t.type === shellConstants.vscode.tab.tabTypes.note)
            .map((t) => (t.data as Note).id);
        const tempNoteId = generateTempId(existingIds);
        const name = generateUnsavedName(tempNoteId);

        const newNote: Note = {
            id: tempNoteId,
            name,
            userId: $user.userId || 0,
            description: "",
            hashtags: "",
            statusCode: standardRegistryConstants.activeStatus.active,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: $user.userName || "Unknown",
            deletedAt: null,
        };

        const tabId = `note-${tempNoteId}-${Date.now()}`;
        setOpenTabs((prev) => [...prev, {
            id: tabId,
            type: shellConstants.vscode.tab.tabTypes.note,
            data: newNote,
            data0: newNote,
            title: name,
            hasUnsavedChanges: false,
            metadata: {
                taskId: task.id,
                taskTitle: task.title,
                taskSnapshot: task,
                // folderWorkspaceItemId tells upsertOrchestraitor where to place the note
                folderWorkspaceItemId: task.folderWorkspaceItemId ?? null,
            },
        }]);
        setActiveTabId(tabId);
        setShouldFocusNoteName(true);
    }
    return {
        loadFolderItems,
        openFolderItem,
        createTaskNote,
    };
};



