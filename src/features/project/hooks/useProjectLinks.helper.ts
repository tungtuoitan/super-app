/**
 * Project Links Helper (task #1477)
 * Functions only — links in the "Links" folder at the root of the project's workspace.
 */
import { useConsoleHelper, useConfirmationPopoverHelper, useLinkDialogHelper, linkService, parseApiError, _openExternalUrl } from "@/shared";
import type { LinkDTO } from "@/shared";
import { getProjectLinksState } from "../store/useProjectLinks.store";

export const useProjectLinksHelper = () => {
    const _console = useConsoleHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { openLinkDialog } = useLinkDialogHelper();

    const loadProjectLinks = async (projectId: number) => {
        const { setProjectLinks, setIsLoadingProjectLinks } = getProjectLinksState();
        if (!projectId || projectId <= 0) {
            setProjectLinks([]);
            return;
        }
        setIsLoadingProjectLinks(true);
        try {
            const res = await linkService._getProjectLinks(projectId);
            setProjectLinks(res.success ? res.data ?? [] : []);
        } catch {
            setProjectLinks([]);
        } finally {
            setIsLoadingProjectLinks(false);
        }
    };

    const addProjectLink = (projectId: number) => {
        openLinkDialog({
            title: "Add link to project",
            submitLabel: "Add link",
            onSubmit: async ({ name, url }) => {
                try {
                    await linkService._addProjectLink(projectId, { url, name: name || undefined });
                } catch (error) {
                    throw new Error((await parseApiError(error)) || "Could not add the link");
                }
                _console.success("Link added");
                await loadProjectLinks(projectId);
            },
        });
    };

    const editProjectLink = (projectId: number, link: LinkDTO) => {
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
                await loadProjectLinks(projectId);
            },
        });
    };

    const removeProjectLink = (event: React.MouseEvent, projectId: number, link: LinkDTO) => {
        showConfirmation({
            title: link.name,
            subtitle: "Remove this link? It is moved to trash in the project's workspace (Links folder).",
            confirmText: "Remove",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl: event.currentTarget as HTMLElement,
            onConfirm: async () => {
                try {
                    await linkService._removeProjectLink(projectId, link.workspaceItemId);
                    _console.success("Link removed");
                } catch (error) {
                    _console.error((await parseApiError(error)) || "Could not remove the link");
                }
                await loadProjectLinks(projectId);
            },
        });
    };

    const openProjectLink = (link: LinkDTO) => {
        _openExternalUrl(link.url);
    };

    return { loadProjectLinks, addProjectLink, editProjectLink, removeProjectLink, openProjectLink };
};
