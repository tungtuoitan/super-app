/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useState, useEffect } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { WorkspaceTree } from "../Workspace/Explorer/WorkspaceTree";
import { useWorkspaceOperation } from "@/hooks/workspace/useWorkspaceOperation.helper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { Loader2 } from "lucide-react";
import { FolderDialog } from "../Workspace/Explorer/FolderDialog/FolderDialog";
import { useAuthStore } from "@/store/auth/Auth.store";
import { GenericFilterPopup } from "@/Components/shared/GenericFilterPopup";
import { constants } from "@/utils/constants";
import {useGridControlStore} from "@/store/grid/useGridControl.store";

/**
 * Workspace View - WorkspaceTree for folder navigation with workspace selection
 */
export function WorkspaceView() {
    const { $user } = useAuthStore();
    const { allWorkspaces, currentTree, isLoadingWorkspaces, isLoadingTree } = useWorkspaceStore();
    const { loadAllWorkspaces, selectWorkspace, loadTree } = useWorkspaceOperation();
    const { setModuleName, setFilterViewKey } = useGridControlStore();
    const [selectedOption, setSelectedOption] = useState<IAutoCompleteOptions | null>(null);


    // Load workspaces on mount
    useEffect(() => {
        if(!$user.userId || !$user.filters) return;
        loadAllWorkspaces();
    }, [$user.userId, $user.filters]);

    // Sync selected option with currentTree.id from store
    useEffect(() => {
        if (currentTree?.id && allWorkspaces.length > 0) {
            const workspace = allWorkspaces.find((ws) => ws.id === currentTree.id);
            if (workspace) {
                setSelectedOption({
                    id: workspace.id.toString(),
                    label: workspace.name,
                    desc: workspace.description || workspace.name,
                    active: true,
                });
            }
        }
    }, [currentTree?.id, allWorkspaces]);

    // Convert workspaces to autocomplete options
    const workspaceOptions: IAutoCompleteOptions[] = allWorkspaces.map((ws) => ({
        id: ws.id.toString(),
        label: ws.name,
        desc: ws.description || ws.name,
        active: true,
    }));

    // Handle workspace selection change
    const handleWorkspaceChange = (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        setSelectedOption(newValue);

        if (newValue?.id) {
            const workspaceId = parseInt(newValue.id.toString());
            selectWorkspace(workspaceId);
        }
    };



    return (
        <div className="h-full overflow-auto flex flex-col">
            {/* Workspace Selector */}
            <div className="px-3 py-2">
                <GenericAutoComplete
                    allOptions={workspaceOptions}
                    value={selectedOption}
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
