/**
 * TaskNotesLinksRow — one row of "Notes & Links" (task #1487).
 * Icon: note / link (by host) / file / folder. Link → edit + remove; item linked from elsewhere → unlink.
 */
import { X, Pencil, FileText, FileIcon, Folder, Laptop } from "lucide-react";
import { LinkKindIcon, _isGithubRepoUrl, _openLocalUrl } from "@/shared";
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
            className="group flex h-7 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[13px] transition-colors duration-100 hover:bg-sa-hover"
            onClick={() => openNotesLinksItem(item)}
            title={url ?? name}
        >
            {kind === "link" ? (
                <LinkKindIcon url={url} className={iconClass} />
            ) : kind === "note" ? (
                <FileText className={iconClass} />
            ) : kind === "folder" ? (
                <Folder className={iconClass} />
            ) : (
                <FileIcon className={iconClass} />
            )}
            <span className="flex-1 truncate text-left hover:underline">{name}</span>
            {isFromElsewhere && (
                <span
                    className="shrink-0 rounded-md border border-sa-border-strong px-1.5 text-[11px] leading-4 text-muted-foreground"
                    title="Linked from elsewhere in the workspace"
                >
                    linked
                </span>
            )}
            {_isGithubRepoUrl(url) && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        _openLocalUrl(url);
                    }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity duration-100 hover:text-foreground group-hover:opacity-100"
                    title="Open local (VS Code)"
                >
                    <Laptop className="h-3 w-3" />
                </button>
            )}
            {!isDisabled && link?.isLink && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        editTaskLink(selectedTask, link);
                    }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity duration-100 hover:text-foreground group-hover:opacity-100"
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
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity duration-100 hover:text-sa-danger group-hover:opacity-100"
                    title={isFromElsewhere ? "Unlink" : "Remove link"}
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}
