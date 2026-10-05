/**
 * TaskLinks — "Links" section of the task detail (task #1477).
 * Links (GitHub / Drive / web) live in the task folder of the project's workspace;
 * items linked from elsewhere in the workspace (notes, files) are listed too.
 */
import { Loader2, Plus, X, Pencil, FileText, Folder } from "lucide-react";
import { LinkKindIcon } from "@/shared";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskDetailStore } from "../../store/useTaskDetail.store";
import { useTaskLinksHelper } from "../../hooks/useTaskLinks.helper";

export function TaskLinks() {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { taskLinks, isLoadingTaskLinks } = useTaskDetailStore();
    const { addTaskLink, editTaskLink, removeTaskLink, openTaskLink } = useTaskLinksHelper();

    if (!selectedTask || selectedTask.id <= 0) return null;

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
                <LinkKindIcon className="h-4 w-4" />
                Links
                {isLoadingTaskLinks && <Loader2 className="h-3 w-3 animate-spin" />}
                {!isDisabled && (
                    <button
                        onClick={() => addTaskLink(selectedTask)}
                        className="ml-auto p-0.5 rounded hover:bg-muted transition-colors"
                        title="Add link (URL, GitHub, Drive…)"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                )}
            </label>

            {taskLinks.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {taskLinks.map((link) => (
                        <div
                            key={link.workspaceItemId}
                            className="group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-muted/50 hover:bg-muted cursor-pointer"
                            onClick={() => openTaskLink(link)}
                            title={link.url ?? link.name}
                        >
                            {link.isLink || link.entityType === 4 ? (
                                <LinkKindIcon url={link.url} className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                            ) : link.entityType === 3 ? (
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                                <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="flex-1 truncate hover:text-primary hover:underline text-left">{link.name}</span>
                            {!isDisabled && link.isLink && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        editTaskLink(selectedTask, link);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-background transition-opacity"
                                    title="Edit link"
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                            )}
                            {!isDisabled && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTaskLink(e, selectedTask, link);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity"
                                    title={link.isLink ? "Remove link" : "Unlink"}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                !isLoadingTaskLinks && <p className="text-xs text-muted-foreground">No links yet</p>
            )}
        </div>
    );
}
