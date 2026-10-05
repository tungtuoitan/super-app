/**
 * TaskNotesLinks — "Notes & Links" section of the task detail (task #1487, was Inner List + Links).
 * Notes and links of the task folder in the project's workspace, plus items linked from elsewhere,
 * in one list (oldest first) told apart by icon.
 */
import { Loader2, FilePlus, Paperclip, Link } from "lucide-react";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskNotesLinksSelector } from "../../Selectors/TaskNotesLinksSelector";
import { useTaskLinksHelper } from "../../hooks/useTaskLinks.helper";
import { useTaskWorkspaceItemHelper } from "../../hooks/useTaskWorkspaceItem.helper";
import { TaskNotesLinksRow } from "./TaskNotesLinksRow";

export function TaskNotesLinks() {
    const { selectedTask, currentProject, isDisabled } = useTaskDetailSelector();
    const { notesLinksItems, isLoadingNotesLinks } = useTaskNotesLinksSelector();
    const { addTaskLink } = useTaskLinksHelper();
    const { createTaskNote } = useTaskWorkspaceItemHelper();

    if (!selectedTask || selectedTask.id <= 0) return null;

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Notes & Links
                {isLoadingNotesLinks && <Loader2 className="h-3 w-3 animate-spin" />}
                {!isDisabled && (
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => createTaskNote(selectedTask, currentProject?.workspaceId)}
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                            title="New note"
                        >
                            <FilePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => addTaskLink(selectedTask)}
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                            title="Add link (URL, GitHub, Drive…)"
                        >
                            <Link className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </label>

            {notesLinksItems.length > 0 ? (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                    {notesLinksItems.map((item) => (
                        <TaskNotesLinksRow key={item.workspaceItemId} workspaceItemId={item.workspaceItemId} />
                    ))}
                </div>
            ) : (
                !isLoadingNotesLinks && <p className="text-xs text-muted-foreground">No notes or links yet</p>
            )}
        </div>
    );
}
