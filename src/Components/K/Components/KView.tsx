/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useEffect, useMemo, useCallback } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useKStore } from "../store/K.store";
import { useKLoader } from "../hooks";
import { useKTabHelper } from "../hooks/useKTab.helper";
import { KTree } from "./KExplorer/KTree";
import { KDialog } from "./KExplorer/KDialog/KDialog";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";

/**
 * Workspace View - KTree for folder navigation with workspace selection
 */
export function KView() {
    const { $user } = useAuthStore();
    const { allK, isLoadingK, isLoadingTree, isLoadingTreeByOpeningNode, selectedKId, setSelectedKId } = useKStore();
    const { loadAllK, loadTree, softDeleteKnowledge } = useKLoader();
    const { openNewKnowledgeTab, openKnowledgeTab } = useKTabHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    // Load workspaces on mount
    useEffect(() => {
        if (!$user.userId) return;
        loadAllK();
    }, [$user.userId, $user.userToken]);

    useEffect(() => {
        if (!$user.userId || !$user.filters || selectedKId === null) return;
        loadTree();
    }, [$user.userId, $user.userToken, $user.filters, selectedKId]);

    // Convert workspaces to autocomplete options (include imageUrl)
    const workspaceOptions: IAutoCompleteOptions[] = useMemo(
        () =>
            allK.map((ws) => ({
                id: ws.id.toString(),
                label: ws.name,
                desc: ws.description || ws.name,
                active: !ws.deletedAt,
                longDesc: ws.deletedAt ? "(deleted)" : undefined,
                imageUrl: ws.imageBase64 || undefined,
            })),
        [allK],
    );

    // Handle workspace selection change
    const handleWorkspaceChange = async (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const newWorkspaceId = newValue?.id ? parseInt(newValue.id.toString()) : null;
        if (newWorkspaceId === selectedKId) return;
        setSelectedKId(newWorkspaceId);
    };

    // Right-click context menu on the selector area
    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const selected = selectedKId != null ? allK.find((k) => k.id === selectedKId) : undefined;
            showContextMenu(e, constants.contextMenu.contextMenuTypes.kKnowledgeSelector, {
                hasSelected: selected != null,
                onAdd: () => openNewKnowledgeTab(),
                onEdit: () => { if (selected) openKnowledgeTab(selected); },
                onDelete: async () => {
                    if (selectedKId != null) {
                        await softDeleteKnowledge(selectedKId);
                    }
                },
            });
        },
        [showContextMenu, selectedKId, allK, openNewKnowledgeTab, openKnowledgeTab, softDeleteKnowledge],
    );

    return (
        <div className="h-full overflow-auto flex flex-col">
            {/* Workspace Selector */}
            <div className="px-3 py-2" onContextMenu={handleContextMenu}>
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

            {/* Workspace Tree */}
            <div className="flex-1 overflow-hidden relative">
                <KTree />
                <KDialog />

                {/* Loading Overlay */}
                {(isLoadingK || isLoadingTree || isLoadingTreeByOpeningNode) && (
                    <div className="absolute inset-0 bg-background__ backdrop-blur-sm__ flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
