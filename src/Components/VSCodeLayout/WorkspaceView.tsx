/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useState, useEffect } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { WorkspaceTree } from "../Workspace/Explorer/WorkspaceTree";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { Loader2 } from "lucide-react";
import { FolderDialog } from "../Workspace/Explorer/FolderDialog/FolderDialog";
import { NoteGridPopup } from "../Workspace/NoteGridPopup";
import { useAuthStore } from "@/store/auth/Auth.store";
import { GenericFilterPopup } from "@/Components/shared/GenericFilterPopup";
import { constants } from "@/utils/constants";
import {useGridControlStore} from "@/store/grid/useGridControl.store";

/**
 * Workspace View - WorkspaceTree for folder navigation with workspace selection
 */
export function WorkspaceView() {
    const { $user } = useAuthStore();
    const { allWorkspaces, currentWorkspace, isLoadingWorkspaces, isLoadingTree, selectedWorkspaceId,setSelectedWorkspaceId } = useWorkspaceStore();
    const { loadAllWorkspaces, loadTree } = useWorkspaceLoader();
    const { setModuleName, setFilterViewKey } = useGridControlStore();


    // Load workspaces on mount
    useEffect(() => {
        if(!$user.userId ) return;
        loadAllWorkspaces();
    }, [$user.userId]);

    useEffect(() => {
        if(!$user.userId || !$user.filters || selectedWorkspaceId === null) return;
            loadTree()
    }, [$user.userId, $user.filters, selectedWorkspaceId]);

    // Sync selected option with currentWorkspace.id from store
    useEffect(() => {
        if (currentWorkspace?.id && allWorkspaces.length > 0) {
            const workspace = allWorkspaces.find((ws) => ws.id === currentWorkspace.id);
            if (workspace) {
                setSelectedWorkspaceId(workspace.id);
            }
        }
    }, [currentWorkspace?.id, allWorkspaces]);

    // Convert workspaces to autocomplete options
    const workspaceOptions: IAutoCompleteOptions[] = allWorkspaces.map((ws) => ({
        id: ws.id.toString(),
        label: ws.name,
        desc: ws.description || ws.name,
        active: true,
    }));

    // Handle workspace selection change
    const handleWorkspaceChange = (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        setSelectedWorkspaceId(newValue?.id ? parseInt(newValue.id.toString()) : null);
    };



    return (
        <div className="h-full overflow-auto flex flex-col">
            {/* Workspace Selector */}
            <div className="px-3 py-2">
                <GenericAutoComplete
                    allOptions={workspaceOptions}
                    value={workspaceOptions.find(option => option.id === selectedWorkspaceId?.toString()) || null}
                    onChange={handleWorkspaceChange}
                    inputProps={{
                        name: "workspace",
                        label: "",
                        required: false,
                    }}
                    disabled={isLoadingWorkspaces || workspaceOptions.length === 0}
                    size="small"
                />

                {/* Filter Popup */}
                {/* <GenericFilterPopup /> */}
            </div>

            {/* Workspace Tree */}
            <div className="flex-1 overflow-hidden relative">
                <WorkspaceTree />
                <FolderDialog />
                <NoteGridPopup />

                {/* Loading Overlay */}
                {(isLoadingWorkspaces || isLoadingTree) && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
