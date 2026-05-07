/**
 * Workspace View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useEffect, useMemo, useCallback, useState } from "react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared";
import { CalendarClock, Loader2, RotateCw } from "lucide-react";
import { useAuthStore } from "@/shared";
import { useKStore } from "../store/useK.store";
import { useKTabHelper } from "../hooks/useKTab.helper";
import { KTree } from "./KExplorer/KTree";
import { KDialog } from "./KDialog";
import { useMenuContextHelper } from "@/shared";
import {useKLoader} from "../hooks/kTree/useK.loader";

/**
 * Workspace View - KTree for folder navigation with workspace selection
 */
export function KView() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { $user } = useAuthStore();
    const { allK, isLoadingK, isLoadingTree, isLoadingTreeByOpeningNode, selectedKId, setSelectedKId, dailyReviewDueCount } = useKStore();
    const { loadAllK, loadTree, softDeleteKnowledge, loadDailyReviewCount } = useKLoader();
    const { openNewKnowledgeTab, openKnowledgeTab, openGlobalDailyReviewTab } = useKTabHelper();
    const { showContextMenu } = useMenuContextHelper();

    // Load workspaces + daily review count on mount
    useEffect(() => {
        if (!$user.userId) return;
        loadAllK();
        loadDailyReviewCount();
    }, [$user.userId, $user.userToken]);

    useEffect(() => {
        if (!$user.userId || !$user.filters || selectedKId === null) return;
        loadTree();
    }, [$user.userId, $user.userToken, $user.filters, selectedKId]);

    // Convert workspaces to autocomplete options (include imageUrl)
    const workspaceOptions: IAutoCompleteOptions[] = allK.map((ws) => ({
                id: ws.id.toString(),
                label: ws.name,
                desc: ws.description || ws.name,
                active: !ws.deletedAt,
                longDesc: ws.deletedAt ? "(deleted)" : undefined,
                imageUrl: ws.imageBase64 || undefined,
            }))

    // Handle workspace selection change
    const handleWorkspaceChange = async (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const newWorkspaceId = newValue?.id ? parseInt(newValue.id.toString()) : null;
        if (newWorkspaceId === selectedKId) return;
        setSelectedKId(newWorkspaceId);
        const newK = newWorkspaceId != null ? allK.find(k => k.id === newWorkspaceId) : null;
        if (newK) openKnowledgeTab(newK);
    };

    // Right-click context menu on the selector area
    const handleContextMenu =
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const selected = selectedKId != null ? allK.find((k) => k.id === selectedKId) : undefined;
            showContextMenu(e, "k-knowledge-selector", {
                hasSelected: selected != null,
                onAdd: () => openNewKnowledgeTab(),
                onEdit: () => { if (selected) openKnowledgeTab(selected); },
                onDelete: async () => {
                    if (selectedKId != null) {
                        await softDeleteKnowledge(selectedKId);
                    }
                },
            });
        }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([loadAllK(), loadDailyReviewCount()]);
            if (selectedKId !== null) {
                await loadTree();
            }
        } finally {
            setIsRefreshing(false);
        }
    };
        

    return (
        <div className="h-full overflow-auto flex flex-col">
        {/* Workspace Selector */}
            <div className="px-3 py-2 flex items-end gap-2" onContextMenu={handleContextMenu}>
                <div className="flex-1">
                    <GenericAutoComplete
                        allOptions={workspaceOptions.sort((a, b) => {
                            const aActive = a.active ? 1 : 0;
                            const bActive = b.active ? 1 : 0;

                            if (aActive !== bActive) {
                                return bActive - aActive;
                            }

                            return (a?.desc ?? "").localeCompare(b?.desc ?? "");
                        })}
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
                <div className="flex items-center gap-2 h-full">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoadingK}
                        className="pl-1 rounded-md hover:opacity-100 opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                        title="Refresh knowledge list"
                    >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>

                </div>
            </div>

            {/* Daily Review shortcut */}
            {/* {dailyReviewDueCount > 0 && (
                <button
                    onClick={openGlobalDailyReviewTab}
                    className="mx-3 mb-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                    <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Daily Review</span>
                    <span className="ml-auto shrink-0 bg-blue-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {dailyReviewDueCount}
                    </span>
                </button>
            )} */}

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
