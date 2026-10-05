/**
 * ProjectLinks — "Links" of a project (task #1477): GitHub / Drive / web links kept in the
 * "Links" folder at the root of the project's workspace.
 */
import { Loader2, Plus, X, Pencil, Laptop } from "lucide-react";
import { LinkKindIcon, _isGithubRepoUrl, _openLocalUrl } from "@/shared";
import { useProjectDetailSelector } from "../../Selectors/useProjectDetail.selector";
import { useProjectLinksStore } from "../../store/useProjectLinks.store";
import { useProjectLinksHelper } from "../../hooks/useProjectLinks.helper";
import { useProjectLinksHeadless } from "../../hooks/useProjectLinks.headless";

export function ProjectLinks() {
    const { selectedProject, isDeleted } = useProjectDetailSelector();
    const { projectLinks, isLoadingProjectLinks } = useProjectLinksStore();
    const { addProjectLink, editProjectLink, removeProjectLink, openProjectLink } = useProjectLinksHelper();
    useProjectLinksHeadless();

    if (!selectedProject || selectedProject.id <= 0) return null;
    const canEdit = !isDeleted && !!selectedProject.workspaceId;

    return (
        <div className="space-y-1 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Links
                {isLoadingProjectLinks && <Loader2 className="h-3 w-3 animate-spin" />}
                {canEdit && (
                    <button
                        onClick={() => addProjectLink(selectedProject.id)}
                        className="ml-auto p-0.5 rounded hover:bg-muted transition-colors normal-case"
                        title="Add link (URL, GitHub, Drive…)"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                )}
            </label>

            {projectLinks.length > 0 ? (
                <div className="space-y-1 max-h-[220px] overflow-y-auto">
                    {projectLinks.map((link) => (
                        <div
                            key={link.workspaceItemId}
                            className="group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-muted/50 hover:bg-muted cursor-pointer"
                            onClick={() => openProjectLink(link)}
                            title={link.url ?? link.name}
                        >
                            <LinkKindIcon url={link.url} className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                            <span className="flex-1 truncate hover:text-primary hover:underline">{link.name}</span>
                            {_isGithubRepoUrl(link.url) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        _openLocalUrl(link.url);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-background transition-opacity"
                                    title="Open local (VS Code)"
                                >
                                    <Laptop className="h-3 w-3" />
                                </button>
                            )}
                            {canEdit && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            editProjectLink(selectedProject.id, link);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-background transition-opacity"
                                        title="Edit link"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeProjectLink(e, selectedProject.id, link);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity"
                                        title="Remove link"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                !isLoadingProjectLinks && <p className="text-xs text-muted-foreground">No links yet</p>
            )}
        </div>
    );
}
