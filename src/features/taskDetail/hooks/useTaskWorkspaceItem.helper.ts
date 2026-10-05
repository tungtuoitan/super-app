/**
 * Task Workspace Item Helper
 * Functions only â€” managing notes linked to a task via workspace folder.
 * State lives in useTaskStore.
 */


import { standardRegistryConstants, useAuthStore, useConsoleHelper, linkService, parseApiError, _isLinkMime, _openExternalUrl } from "@/shared";
import { shellConstants } from "@/shell";
import type { Note } from "@/features/note";
import { type Task } from "../types/task.types";
import { type TaskFolderItem } from "../types/taskDetail.types";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { useNoteDetailStore } from "@/features/note";
import { constants } from "@/shared";
import { generateTempId, generateUnsavedName, workspaceService } from "@/features/workspace";
import { WorkspaceNoteItem, WorkspaceFileItem } from "@/features/workspace";
import { useEditorTabBarHelper } from "@/shell";

export const useTaskWorkspaceItemHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { openTabs, openTab, getActiveTab, patchTab } = useEditorTabBarHelper();
    const { setShouldFocusNoteName } = useNoteDetailStore();
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

            // Links come from GET /api/task/{id}/links (edit/remove need their LinkDTO) — task #1477/#1487
            const children = result.object.flatData.filter(
                (item) =>
                    item.parentId === task.folderWorkspaceItemId &&
                    (item.entityType === 3 || item.entityType === 4) &&
                    !item.deletedAt &&
                    !(item.entityType === 4 && _isLinkMime((item as WorkspaceFileItem).data.mimeType))
            ) as (WorkspaceNoteItem | WorkspaceFileItem)[];

            setFolderItems(children.map((item) => ({
                workspaceItemId: item.id,
                entityId: item.entityId,
                entityType: item.entityType,
                name: item.data.name,
                noteData: item.entityType === 3 ? (item as WorkspaceNoteItem).data : undefined,
                url: item.entityType === 4 ? (item as WorkspaceFileItem).data.url : undefined,
                createdAt: item.createdAt,
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
        if (item.entityType === 4) {
            _openExternalUrl(item.url);
            return;
        }
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

    /** The BE may have (re)created the task folder — keep the open task tab in sync (folder items, later saves). */
    const syncTaskFolderId = (task: Task, folderId?: number | null) => {
        if (!folderId || task.folderWorkspaceItemId === folderId) return;
        const tab = getActiveTab();
        if (!tab || (tab.data as Task)?.id !== task.id) return;
        patchTab(tab.id, (cur) => ({
            data: { ...(cur.data as Task), folderWorkspaceItemId: folderId },
            data0: cur.data0 ? { ...(cur.data0 as Task), folderWorkspaceItemId: folderId } : cur.data0,
        }));
    }

    /**
     * Create a new note for a task.
     * Opens a bare note tab. On save, addNoteToTaskFolder places the note inside the task's
     * workspace folder — asked from the BE first, which creates it when the task has none or its
     * folder sits in another workspace (task moved to another project) — task #1487.
     */
    const createTaskNote = async (task: Task, workspaceId?: number | null) => {
        let folderWorkspaceItemId: number | null = null;
        try {
            const res = await linkService._getOrCreateTaskFolder(task.id);
            folderWorkspaceItemId = res.object?.folderWorkspaceItemId ?? null;
            workspaceId = res.object?.workspaceId ?? workspaceId;
        } catch (error) {
            _console.error((await parseApiError(error)) || "Could not create the task folder");
            return;
        }
        if (!folderWorkspaceItemId) {
            _console.error("Could not create the task folder");
            return;
        }
        syncTaskFolderId(task, folderWorkspaceItemId);

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
        openTab(newNote, shellConstants.vscode.tab.tabTypes.note, {
            tabId,
            metadata: {
                taskId: task.id,
                taskTitle: task.title,
                taskSnapshot: { ...task, folderWorkspaceItemId },
                // folderWorkspaceItemId tells addNoteToTaskFolder where to place the note
                folderWorkspaceItemId,
                // workspaceId lets addNoteToTaskFolder place the note without re-fetching project
                workspaceId: workspaceId ?? null,
            },
        });
        setShouldFocusNoteName(true);
    }
    return {
        loadFolderItems,
        openFolderItem,
        createTaskNote,
        syncTaskFolderId,
    };
};



