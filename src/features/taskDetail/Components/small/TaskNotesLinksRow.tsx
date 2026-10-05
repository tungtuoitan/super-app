/**
 * TaskNotesLinksRow — one row of "Notes & Links" (task #1487).
 * Icon: note / link (by host) / file / folder. Link → edit + remove; item linked from elsewhere → unlink.
 */
import { X, Pencil, FileText, FileIcon, Folder } from "lucide-react";
import { LinkKindIcon } from "@/shared";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskNotesLinksSelector } from "../../Selectors/TaskNotesLinksSelector";
import { useTaskLinksHelper } from "../../hooks/useTaskLinks.helper";

export function TaskNotesLinksRow({ workspaceItemId }: { workspaceItemId: number }) {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { notesLinksItems } = useTaskNotesLinksSelector();
    const { editTaskLink, removeTaskLink, openNotesLinksItem } = useTaskLinksHelper();

    const item = notesLinksItems.find((row) => row.workspaceItemId === workspaceItemId);
    if (!selectedTask || !item) return null;

    const { kind, name, url, isFromElsewhere, link } = item;
    const iconClass = "h-3.5 w-3.5 text-muted-foreground shrink-0";

    return (
        <div
            className="group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-muted/50 hover:bg-muted cursor-pointer"
            onClick={() => openNotesLinksItem(item)}
            title={url ?? name}
        >
            {kind === "link" ? (
                <LinkKindIcon url={url} className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            ) : kind === "note" ? (
                <FileText className={iconClass} />
            ) : kind === "folder" ? (
                <Folder className={iconClass} />
            ) : (
                <FileIcon className={iconClass} />
            )}
            <span className="flex-1 truncate hover:text-primary hover:underline text-left">{name}</span>
            {isFromElsewhere && (
                <span
                    className="shrink-0 text-[10px] leading-none px-1 py-0.5 rounded border border-border text-muted-foreground"
                    title="Linked from elsewhere in the workspace"
                >
                    linked
                </span>
            )}
            {!isDisabled && link?.isLink && (
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
            {!isDisabled && link && (link.isLink || isFromElsewhere) && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        removeTaskLink(e, selectedTask, link);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity"
                    title={isFromElsewhere ? "Unlink" : "Remove link"}
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}
