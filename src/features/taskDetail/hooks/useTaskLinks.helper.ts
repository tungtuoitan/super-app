/**
 * Task Links Helper (task #1477)
 * Functions only — links of a task (URL / GitHub / Drive, or an item of the project's workspace).
 * A new link is created by the BE inside the task folder (folder created if missing) and tied to
 * the task through pro.task_workspace_item. State lives in useTaskDetailStore.
 */
import { useAuthStore, useConsoleHelper, useConfirmationPopoverHelper, useLinkDialogHelper, linkService, parseApiError, _openExternalUrl } from "@/shared";
import type { LinkDTO } from "@/shared";
import { useEditorTabBarHelper } from "@/shell";
import { workspaceService } from "@/features/workspace";
import type { WorkspaceNoteItem } from "@/features/workspace";
import type { Task } from "../types/task.types";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { useTaskWorkspaceItemHelper } from "./useTaskWorkspaceItem.helper";

export const useTaskLinksHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { openLinkDialog } = useLinkDialogHelper();
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { setTaskLinks, setIsLoadingTaskLinks } = useTaskDetailStore();
    const { openFolderItem } = useTaskWorkspaceItemHelper();

    const loadTaskLinks = async (taskId: number) => {
        if (!taskId || taskId <= 0) {
            setTaskLinks([]);
            return;
        }
        setIsLoadingTaskLinks(true);
        try {
            const res = await linkService._getTaskLinks(taskId);
            setTaskLinks(res.success ? res.data ?? [] : []);
        } catch {
            setTaskLinks([]);
        } finally {
            setIsLoadingTaskLinks(false);
        }
    };

    /** The BE may have created the task folder — keep the open tab in sync (Inner List, later saves). */
    const _syncFolderId = (task: Task, added?: LinkDTO) => {
        if (task.folderWorkspaceItemId || !added?.parentId) return;
        const tab = getActiveTab();
        if (!tab || (tab.data as Task)?.id !== task.id) return;
        const folderId = added.parentId;
        patchTab(tab.id, (cur) => ({
            data: { ...(cur.data as Task), folderWorkspaceItemId: folderId },
            data0: cur.data0 ? { ...(cur.data0 as Task), folderWorkspaceItemId: folderId } : cur.data0,
        }));
    };

    const addTaskLink = (task: Task) => {
        openLinkDialog({
            title: "Add link to task",
            submitLabel: "Add link",
            onSubmit: async ({ name, url }) => {
                let res;
                try {
                    res = await linkService._addTaskLink(task.id, { url, name: name || undefined });
                } catch (error) {
                    throw new Error((await parseApiError(error)) || "Could not add the link");
                }
                _syncFolderId(task, res.data?.[0]);
                _console.success("Link added");
                await loadTaskLinks(task.id);
            },
        });
    };

    const editTaskLink = (task: Task, link: LinkDTO) => {
        openLinkDialog({
            title: "Edit link",
            initial: { name: link.name, url: link.url ?? "" },
            onSubmit: async ({ name, url }) => {
                try {
                    await linkService._updateFile(link.entityId, { name: name || link.name, url });
                } catch (error) {
                    throw new Error((await parseApiError(error)) || "Could not save the link");
                }
                _console.success("Link updated");
                await loadTaskLinks(task.id);
            },
        });
    };

    const removeTaskLink = (event: React.MouseEvent, task: Task, link: LinkDTO) => {
        showConfirmation({
            title: link.name,
            subtitle: link.isLink
                ? "Remove this link from the task? It is also deleted from the task folder (restorable from the workspace)."
                : "Unlink this item from the task? The item itself stays in the workspace.",
            confirmText: link.isLink ? "Remove" : "Unlink",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl: event.currentTarget as HTMLElement,
            onConfirm: async () => {
                try {
                    await linkService._removeTaskLink(task.id, link.workspaceItemId);
                    _console.success(link.isLink ? "Link removed" : "Item unlinked");
                } catch (error) {
                    _console.error((await parseApiError(error)) || "Could not remove the link");
                }
                await loadTaskLinks(task.id);
            },
        });
    };

    /** Link / file: open url. Note: open its editor tab (needs the note data from the tree). */
    const openTaskLink = async (link: LinkDTO) => {
        if (link.url) {
            _openExternalUrl(link.url);
            return;
        }
        if (link.entityType !== 3) return;
        try {
            const tree = await workspaceService._getWorkspaceTreeV2($user.userToken ?? "", link.workspaceId);
            const item = tree.object?.flatData?.find((i) => i.id === link.workspaceItemId) as WorkspaceNoteItem | undefined;
            if (!item) return;
            openFolderItem({ workspaceItemId: item.id, entityId: item.entityId, entityType: 3, name: item.data.name, noteData: item.data });
        } catch {
            _console.error("Could not open the note");
        }
    };

    return { loadTaskLinks, addTaskLink, editTaskLink, removeTaskLink, openTaskLink };
};
