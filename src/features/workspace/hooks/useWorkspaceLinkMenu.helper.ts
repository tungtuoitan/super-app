import { useAuthStore, useConsoleHelper, useMenuContextHelper, useLinkDialogHelper, linkService, linkConstants, parseApiError, _isLinkMime, _openExternalUrl, _linkDefaultName } from "@/shared";
import { useWorkspaceStore } from "../store/workspace.store";
import { workspaceService } from "../service/workspace.service";
import { WorkspaceItemAction } from "../types/workspace.types";
import { useWorkspaceLoader } from "./useWorkspace.helper";
import type { WorkspaceFileItem } from "../types/workspace-v2.types";

/**
 * Links in the workspace explorer (task #1477): a link is a file item whose file has
 * mimeType "text/x-uri". Create from a folder's menu, open / copy / edit from the item's menu.
 */
export const useWorkspaceLinkMenuHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();
    const { openLinkDialog } = useLinkDialogHelper();

    const _errorMessage = async (error: unknown, fallback: string) => {
        const message = await parseApiError(error);
        return message || fallback;
    };

    /** contextData = folder item (or the workspace root, entityId < 0). */
    const createLink = (contextData: any) => {
        setIsMenuContextOpen(false);
        const workspaceId = currentWorkspace?.id;
        if (!workspaceId) {
            _console.error("No workspace selected");
            return;
        }
        const parentId = contextData && contextData.entityId > 0 && contextData.id > 0 ? contextData.id : null;

        openLinkDialog({
            title: "New Link",
            submitLabel: "Add link",
            onSubmit: async ({ name, url }) => {
                let res;
                try {
                    res = await workspaceService._upsertWorkspaceItems($user.userToken, workspaceId, [{
                        action: WorkspaceItemAction.Create,
                        entityType: linkConstants.entityTypeFile,
                        parentId,
                        fileData: { name: name || _linkDefaultName(url), url, mimeType: linkConstants.mimeType, statusCode: "active" },
                    }]);
                } catch (error) {
                    throw new Error(await _errorMessage(error, "Could not create the link"));
                }
                if (!res?.success) throw new Error(res?.message || "Could not create the link");
                _console.success("Link added");
                await loadTree();
            },
        });
    };

    const openFileItem = (fileItem: WorkspaceFileItem) => {
        if (!_openExternalUrl(fileItem.data.url)) _console.error("This item has no web address to open");
    };

    const copyFileUrl = async (fileItem: WorkspaceFileItem) => {
        setIsMenuContextOpen(false);
        if (!fileItem.data.url) return;
        try {
            await navigator.clipboard.writeText(fileItem.data.url);
            _console.success("URL copied");
        } catch {
            _console.error("Could not copy the URL");
        }
    };

    /** Link: edit name + url. Uploaded file: rename only. */
    const editFileItem = (fileItem: WorkspaceFileItem) => {
        setIsMenuContextOpen(false);
        const isLink = _isLinkMime(fileItem.data.mimeType);
        openLinkDialog({
            title: isLink ? "Edit Link" : "Rename File",
            showUrl: isLink,
            initial: { name: fileItem.data.name, url: fileItem.data.url ?? "" },
            onSubmit: async ({ name, url }) => {
                try {
                    await linkService._updateFile(fileItem.entityId, isLink ? { name: name || _linkDefaultName(url), url } : { name });
                } catch (error) {
                    throw new Error(await _errorMessage(error, "Could not save"));
                }
                _console.success(isLink ? "Link updated" : "File renamed");
                await loadTree();
            },
        });
    };

    return { createLink, openFileItem, copyFileUrl, editFileItem };
};
