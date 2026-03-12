/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useState, useEffect, useMemo } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/Auth.store";
import {useKStore} from "../store/K.store";
import {useKLoader} from "../hooks";
import {KTree} from "./KExplorer/KTree";
import {KFolderDialog} from "./KExplorer/KFolderDialog/KFolderDialog";

/**
 * Workspace View - KTree for folder navigation with workspace selection
 */
export function KView() {
    const { $user } = useAuthStore();
    const { allK, isLoadingK, isLoadingTree, isLoadingTreeByOpeningNode, selectedKId, setSelectedKId } = useKStore();
    const { loadAllK, loadTree } = useKLoader();

    // Load workspaces on mount
    useEffect(() => {
        if (!$user.userId) return;
        loadAllK();
    }, [$user.userId, $user.userToken]);

    useEffect(() => {
        if (!$user.userId || !$user.filters || selectedKId === null) return;
        loadTree();
    }, [$user.userId, $user.userToken, $user.filters, selectedKId]);

    // Convert workspaces to autocomplete options
    const workspaceOptions: IAutoCompleteOptions[] = allK.map((ws) => {
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
        if (newWorkspaceId === selectedKId) {
            return;
        }

        // const saveSuccess = await saveNewsBeforeNavigate();

        // if (!saveSuccess) {
        //     return;
        // }

        setSelectedKId(newWorkspaceId);
    };

    return (
        <div className="h-full overflow-auto flex flex-col">
            {/* Workspace Selector */}
            <div className="px-3 py-2">
                <div>
                    <GenericAutoComplete
                        allOptions={workspaceOptions}
                        value={workspaceOptions.find((option) => option.id === selectedKId?.toString()) || null}
                        onChange={handleWorkspaceChange}
                        inputProps={{
                            name: "workspace",
                            label: "",
                            required: false,
                        }}
                        disabled={isLoadingK || workspaceOptions.length === 0}
                        size="small"
                    />
                </div>

                {/* Filter Popup */}
                {/* <GenericFilterPopup /> */}
            </div>

            {/* Workspace Tree */}
            <div className="flex-1 overflow-hidden relative">
                <KTree />
                <KFolderDialog />

                {/* Loading Overlay */}
                {(isLoadingK || isLoadingTree || isLoadingTreeByOpeningNode) && (
                    <div className="absolute inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
