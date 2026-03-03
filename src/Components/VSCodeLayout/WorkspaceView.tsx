/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useState, useEffect, useMemo } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { WorkspaceTree } from "../Workspace/Explorer/WorkspaceTree";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { Loader2 } from "lucide-react";
import { FolderDialog } from "../Workspace/Explorer/FolderDialog/FolderDialog";
import { NoteGridPopup } from "../Workspace/NoteGridPopup";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useWorkspaceHelper } from "@/hooks/workspace/useWorkspaceHelper";

/**
 * Workspace View - WorkspaceTree for folder navigation with workspace selection
 */
export function WorkspaceView() {
    const { $user } = useAuthStore();
    const { allWorkspaces, isLoadingWorkspaces, isLoadingTree, isLoadingTreeByOpeningFolder, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceStore();
    const { loadAllWorkspaces, loadTree } = useWorkspaceLoader();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();

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
    const workspaceOptions: IAutoCompleteOptions[] = allWorkspaces.map((ws) => ({
        id: ws.id.toString(),
        label: ws.name,
        desc: ws.description || ws.name,
        active: true,
    }));

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

    return (
        <div className="h-full overflow-auto flex flex-col">
            {/* Workspace Selector */}
            <div className="px-3 py-2">
                <div>
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

                {/* Filter Popup */}
                {/* <GenericFilterPopup /> */}
            </div>

            {/* Workspace Tree */}
            <div className="flex-1 overflow-hidden relative">
                <WorkspaceTree />
                <FolderDialog />
                <NoteGridPopup />

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
