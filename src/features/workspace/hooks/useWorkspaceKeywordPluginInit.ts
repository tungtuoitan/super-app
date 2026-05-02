import { useWorkspaceStore } from "../store/Workspace.store";
import { useWorkspaceLoader } from "./useWorkspace.loader";
import { useWorkspaceHelper } from "./useWorkspaceHelper";
import { useAuthStore, useConsoleHelper, parseKeywordLink } from "@/shared";
import { shellConstants, useSideBarHelper } from "@/shell";
import { noteService } from "@/features/note";
import type { Note } from "@/features/note";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import { treeMiniHelper } from "./tree.miniHelper";
import { findFolderInWorkspace, findNoteInWorkspace } from "../utils/workspace.find.utils";
import { _setWorkspaceNavigateImpl } from "../shell/workspace.keywordPlugin";
import type { Keyword } from "@/shared";
import type { NavigationContext } from "@/shell";

export function useWorkspaceKeywordPluginInit() {
    const { $user } = useAuthStore();
    const { currentWorkspace, setSelectedWorkspaceId, setSelectedItemIds, setLastSelectedItemId, _treeRef, setIsLoadingTreeByOpeningFolder } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();
    const { setModuleName, moduleName } = useSideBarHelper();
    const _console = useConsoleHelper();

    _setWorkspaceNavigateImpl(async (keyword: Keyword, openedBy: { link: string; label: string } | undefined, ctx: NavigationContext): Promise<boolean> => {
        const parsed = parseKeywordLink(keyword);
        if (!parsed?.workspaceId) return false;

        if (moduleName !== "Workspace") {
            setModuleName("Workspace");
        }

        let targetWorkspace: WorkspaceDTO | null = currentWorkspace;

        if (currentWorkspace?.id !== parsed.workspaceId) {
            const saveSuccess = await saveNewsBeforeNavigate();
            if (!saveSuccess) return true;

            setSelectedWorkspaceId(parsed.workspaceId);
            _console.info("Switching workspace...");

            const loaded = await loadTree(undefined, parsed.workspaceId);
            if (!loaded) {
                _console.error("Failed to load workspace");
                return true;
            }
            targetWorkspace = loaded;
        }

        if (parsed.type === "workspace") {
            _console.success("Switched workspace successfully");
            return true;
        }

        if (parsed.type === "folder" && parsed.folderId) {
            const folderItem = findFolderInWorkspace(targetWorkspace, parsed.workspaceId, parsed.folderId);

            if (folderItem) {
                setSelectedItemIds([folderItem.id]);
                setLastSelectedItemId(folderItem.id);

                if (_treeRef.current && targetWorkspace?.flatData) {
                    setIsLoadingTreeByOpeningFolder(true);
                    try {
                        const treeData = treeMiniHelper.transformToTreeData(targetWorkspace, "");
                        await treeMiniHelper.expandPathToItem(_treeRef, treeData, folderItem.id);
                    } finally {
                        setIsLoadingTreeByOpeningFolder(false);
                    }
                }
                _console.success("Navigated to folder");
            } else {
                _console.error("Folder not found in workspace");
            }
            return true;
        }

        if (parsed.type === "note" && parsed.noteWorkspaceItemId) {
            const noteItem = findNoteInWorkspace(targetWorkspace, parsed.workspaceId, parsed.noteWorkspaceItemId);

            if (noteItem) {
                const note: Note = {
                    id: noteItem.data.id,
                    name: noteItem.data.name,
                    description: noteItem.data.description || "",
                    hashtags: "",
                    statusCode: noteItem.data.statusCode,
                    createdAt: new Date(noteItem.data.createdAt),
                    updatedAt: noteItem.data.updatedAt ? new Date(noteItem.data.updatedAt) : undefined,
                    createdBy: $user.userName || "You",
                    deletedAt: noteItem.data.deletedAt ? new Date(noteItem.data.deletedAt) : null,
                    userId: noteItem.data.userId,
                };

                ctx.openTab(note, shellConstants.vscode.tab.tabTypes.note, openedBy);
                setSelectedItemIds([noteItem.id]);
                setLastSelectedItemId(noteItem.id);

                if (_treeRef.current && targetWorkspace?.flatData) {
                    setIsLoadingTreeByOpeningFolder(true);
                    try {
                        const treeData = treeMiniHelper.transformToTreeData(targetWorkspace, "");
                        await treeMiniHelper.expandPathToItem(_treeRef, treeData, noteItem.id);
                    } finally {
                        setIsLoadingTreeByOpeningFolder(false);
                    }
                }
            } else {
                const result = await noteService.getNotes($user.userToken, {
                    workspaceItemIds: parsed.noteWorkspaceItemId.toString(),
                });

                if (result.success && result.data && result.data.length > 0) {
                    const noteData = result.data[0];
                    const note: Note = {
                        id: noteData.id,
                        name: noteData.name,
                        description: noteData.description || "",
                        hashtags: "",
                        type: noteData.type || "idea",
                        statusCode: noteData.statusCode,
                        createdAt: new Date(noteData.createdAt),
                        updatedAt: noteData.updatedAt ? new Date(noteData.updatedAt) : undefined,
                        createdBy: noteData.createdBy || "You",
                        deletedAt: noteData.deletedAt ? new Date(noteData.deletedAt) : null,
                        userId: noteData.userId,
                    };
                    ctx.openTab(note, shellConstants.vscode.tab.tabTypes.note, openedBy);
                } else {
                    _console.warning("Note not found");
                }
            }
            return true;
        }

        return false;
    });
}
