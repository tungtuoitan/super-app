/**
 * TaskNotesLinks — "Notes & Links" section of the task detail (task #1487, was Inner List + Links).
 * Notes and links of the task folder in the project's workspace, plus items linked from elsewhere,
 * in one list (oldest first) told apart by icon.
 */
import { FilePlus, Link } from "lucide-react";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskNotesLinksSelector } from "../../Selectors/TaskNotesLinksSelector";
import { useTaskLinksHelper } from "../../hooks/useTaskLinks.helper";
import { useTaskWorkspaceItemHelper } from "../../hooks/useTaskWorkspaceItem.helper";
import { TaskNotesLinksRow } from "./TaskNotesLinksRow";
import { SectionTitle } from "./SectionTitle";

export function TaskNotesLinks() {
    const { selectedTask, currentProject, isDisabled } = useTaskDetailSelector();
    const { notesLinksItems, isLoadingNotesLinks } = useTaskNotesLinksSelector();
    const { addTaskLink } = useTaskLinksHelper();
    const { createTaskNote } = useTaskWorkspaceItemHelper();

    if (!selectedTask || selectedTask.id <= 0) return null;

    return (
        <div className="space-y-1">
            <SectionTitle title="Notes & links" isLoading={isLoadingNotesLinks}>
                {!isDisabled && (
                    <>
                        <button
                            onClick={() => createTaskNote(selectedTask, currentProject?.workspaceId)}
                            className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                            title="New note"
                        >
                            <FilePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => addTaskLink(selectedTask)}
                            className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                            title="Add link (URL, GitHub, Drive…)"
                        >
                            <Link className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
            </SectionTitle>

            {notesLinksItems.length > 0 ? (
                <div className="max-h-[240px] space-y-px overflow-y-auto">
                    {notesLinksItems.map((item) => (
                        <TaskNotesLinksRow key={item.workspaceItemId} workspaceItemId={item.workspaceItemId} />
                    ))}
                </div>
            ) : (
                !isLoadingNotesLinks && <p className="px-1.5 text-xs text-muted-foreground">No notes or links yet</p>
            )}
        </div>
    );
}
