/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useEffect, useCallback } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared";
import { WorkspaceTree } from "./Explorer/WorkspaceTree";
import { useWorkspaceLoader } from "../hooks/useWorkspace.helper";
import { useWorkspaceStore } from "../store/workspace.store";
import { Loader2 } from "lucide-react";
import { FolderDialog } from "./Explorer/FolderDialog/FolderDialog";
import { useAuthStore } from "@/shared";
import { useWorkspaceHelper } from "../hooks/useWorkspaceHelper";
import { useMenuContextHelper } from "@/shared";
import { constants } from "@/shared";
import {useWsTabHelper} from "../hooks/ws/useWsTab.helper";

/**
 * Workspace View - WorkspaceTree for folder navigation with workspace selection
 */
export function WorkspaceView() {
    const { $user } = useAuthStore();
    const { allWorkspaces, isLoadingWorkspaces, isLoadingTree, isLoadingTreeByOpeningFolder, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceStore();
    const { loadAllWorkspaces, loadTree, softDeleteWorkspace } = useWorkspaceLoader();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();
    const { openNewWorkspaceTab, openWorkspaceTab } = useWsTabHelper();
    const { showContextMenu } = useMenuContextHelper();

    // Load workspaces on mount
    useEffect(() => {
        if (!$user.userId) return;
        loadAllWorkspaces();
    }, [$user.userId, $user.userToken]);

    useEffect(() => {
        if (!$user.userId || !$user.filters || selectedWorkspaceId === null) return;
        loadTree();
    }, [$user.userId, $user.userToken, $user.filters, selectedWorkspaceId]);

    // Convert workspaces to autocomplete options
    const workspaceOptions: IAutoCompleteOptions[] = allWorkspaces.map((ws) => {
        const isDeleted = !!ws.deletedAt;
        return {
            id: ws.id.toString(),
            label: ws.name,
            desc: ws.description || ws.name,
            active: !isDeleted,
            longDesc: isDeleted ? "(deleted)" : undefined,
        };
    });

    // Handle workspace selection change
    const handleWorkspaceChange = async (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const newWorkspaceId = newValue?.id ? parseInt(newValue.id.toString()) : null;

        // Block change if same workspace
        if (newWorkspaceId === selectedWorkspaceId) {
            return;
        }

        const saveSuccess = await saveNewsBeforeNavigate();

        if (!saveSuccess) {
            return;
        }

        setSelectedWorkspaceId(newWorkspaceId);
    };

    // Right-click context menu on the selector area
    const handleContextMenu = 
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const selected = selectedWorkspaceId != null ? allWorkspaces.find((ws) => ws.id === selectedWorkspaceId) : undefined;
            showContextMenu(e, "workspace-selector", {
                hasSelected: selected != null,
                onAdd: () => openNewWorkspaceTab(),
                onEdit: () => { if (selected) openWorkspaceTab(selected); },
                onDelete: async () => {
                    if (selectedWorkspaceId != null) {
                        await softDeleteWorkspace(selectedWorkspaceId);
                    }
                },
            });
        }

    return (
        <div className="h-full overflow-auto flex flex-col">
            {/* Workspace Selector */}
            <div className="px-3 py-2" onContextMenu={handleContextMenu}>
                <GenericAutoComplete
                        allOptions={workspaceOptions}
                        value={workspaceOptions.find((option) => option.id === selectedWorkspaceId?.toString()) || null}
                        onChange={handleWorkspaceChange}
                        inputProps={{
                            name: "workspace",
                            label: "",
                            required: false,
                        }}
                        disabled={isLoadingWorkspaces || workspaceOptions.length === 0}
                        size="small"
                    />
            </div>

            {/* Workspace Tree */}
            <div className="flex-1 overflow-hidden relative">
                <WorkspaceTree />
                <FolderDialog />

                {/* Loading Overlay */}
                {(isLoadingWorkspaces || isLoadingTree || isLoadingTreeByOpeningFolder) && (
                    <div className="absolute inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
