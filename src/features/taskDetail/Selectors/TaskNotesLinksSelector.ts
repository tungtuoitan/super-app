/**
 * Task Notes & Links Selector (task #1487)
 * Derived values for the "Notes & Links" section: task-folder items (notes, uploaded files)
 * merged with the task links (links in the folder + items tied from elsewhere), oldest first.
 * No functions, no side effects — only derivations.
 */

import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { useTaskDetailSelector } from "./TaskDetailSelector";
import type { TaskNotesLinksItem } from "../types/taskDetail.types";

export const useTaskNotesLinksSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const { folderItems, isLoadingFolderItems, taskLinks, isLoadingTaskLinks } = useTaskDetailStore();

    const folderRows: TaskNotesLinksItem[] = folderItems.map((folderItem) => ({
        workspaceItemId: folderItem.workspaceItemId,
        kind: folderItem.entityType === 3 ? "note" : "file",
        name: folderItem.name,
        url: folderItem.url,
        createdAt: folderItem.createdAt,
        isFromElsewhere: false,
        folderItem,
    }));
    const folderIds = new Set(folderRows.map((row) => row.workspaceItemId));

    const linkRows: TaskNotesLinksItem[] = taskLinks
        .filter((link) => !folderIds.has(link.workspaceItemId))
        .map((link) => ({
            workspaceItemId: link.workspaceItemId,
            kind: link.isLink ? "link" : link.entityType === 3 ? "note" : link.entityType === 2 ? "folder" : "file",
            name: link.name,
            url: link.url,
            createdAt: link.createdAt,
            isFromElsewhere: link.parentId !== selectedTask?.folderWorkspaceItemId,
            link,
        }));

    const _time = (row: TaskNotesLinksItem) => (row.createdAt ? Date.parse(row.createdAt) || 0 : 0);
    const notesLinksItems = [...folderRows, ...linkRows].sort(
        (a, b) => _time(a) - _time(b) || a.workspaceItemId - b.workspaceItemId
    );

    return {
        notesLinksItems,
        isLoadingNotesLinks: isLoadingFolderItems || isLoadingTaskLinks,
    };
};
