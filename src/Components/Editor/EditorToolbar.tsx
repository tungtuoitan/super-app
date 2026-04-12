/**
 * Editor Toolbar
 * Shared toolbar for all editor panel types (Note, Workspace, etc.)
 * Displays status info and action buttons based on tab type and state
 */

import React, { useEffect, useRef, useState } from "react";
import { Save, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
import { useEditorToolbarHelper } from "@/hooks/vsCode/useEditorToolbar.helper";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { constants } from "@/utils/constants";
import { useEditorToolbarStore } from "@/store/editor/EditorToolbar.store";
import { useProjectStore } from "@/store/project/useProject.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { projectService } from "@/services/project.service";
import { Breadcrumb } from "./Breadcrumb";
import { BackButton } from "./BackButton";
import type { Task } from "@/store/task/useTask.store";

export function EditorToolbar() {
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();
    const { projects } = useProjectStore();
    const { $user } = useAuthStore();

    // Get active tab
    const activeTab = getActiveTab();

    // For task tabs without openedBy, derive back button pointing to their project
    const [taskProjectOpenedBy, setTaskProjectOpenedBy] = useState<{ link: string; label: string } | undefined>(undefined);

    useEffect(() => {
        if (activeTab?.type !== constants.vscode.tab.tabTypes.task || activeTab.openedBy) {
            setTaskProjectOpenedBy(undefined);
            return;
        }
        const task = activeTab.data as Task;
        const fromStore = projects.find(p => p.id === task.projectId);
        if (fromStore) {
            setTaskProjectOpenedBy({ link: `sa/p${task.projectId}`, label: fromStore.name });
            return;
        }
        let cancelled = false;
        projectService._getProjectById($user.userToken, task.projectId).then(res => {
            if (!cancelled && res.success && res.data?.[0]) {
                setTaskProjectOpenedBy({ link: `sa/p${task.projectId}`, label: res.data[0].name });
            }
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [activeTab?.id, activeTab?.openedBy]);

    const effectiveOpenedBy = activeTab?.openedBy ?? taskProjectOpenedBy;

    // Get toolbar actions for active tab
    const { upsertOrchestraitor, commonCancel, _deleteStatusText, _itemId } = useEditorToolbarHelper();

    // ── Keyboard shortcut: Ctrl+S or Alt+S → save ────────────────────────────
    // Refs ensure callback is always fresh without re-registering the listener.
    const activeTabRef = useRef(activeTab);
    const isSavingRef = useRef(isSaving);
    const upsertOrchestraitorRef = useRef(upsertOrchestraitor);
    activeTabRef.current = activeTab;
    isSavingRef.current = isSaving;
    upsertOrchestraitorRef.current = upsertOrchestraitor;

    useGlobalShortcut("ctrl+s", { id: "editor-toolbar-save", priority: 50 }, () => {
        if (activeTabRef.current?.hasUnsavedChanges && !isSavingRef.current) {
            upsertOrchestraitorRef.current();
        }
        return true; // always claim — prevent browser Save dialog
    });

    useGlobalShortcut("alt+s", { id: "editor-toolbar-save-alt", priority: 50 }, () => {
        if (activeTabRef.current?.hasUnsavedChanges && !isSavingRef.current) {
            upsertOrchestraitorRef.current();
        }
        return true;
    });

    return (
        <div className="h-6 flex items-center justify-between px-4 bg-black border-b border-white/5 gap-2">
            {/* Left: Back button + Breadcrumb */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {effectiveOpenedBy && (
                    <BackButton openedBy={effectiveOpenedBy} />
                )}
                {activeTab?.breadcrumb && activeTab.breadcrumb.length > 0 && (
                    <Breadcrumb items={activeTab.breadcrumb} />
                )}
            </div>

            {/* Action Buttons */}
            <TooltipProvider>
                <div className="flex gap-1">
                    {(activeTab?.data as any)?.deletedAt && !(activeTab?.data as any).isHardDeleted ? (
                        // Show Restore button for soft deleted items only
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={upsertOrchestraitor}
                                        disabled={isSaving}
                                        className="h-8 w-8 text-green-500 hover:bg-green-500/10 disabled:text-white/20"
                                    >
                                        <Undo2 className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    Restore {activeTab?.type === constants.vscode.tab.tabTypes.note ? constants.vscode.displayNames.note : constants.vscode.displayNames.workspace}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    ) : activeTab && (activeTab.data as any).isHardDeleted ? (
                        // Show message for hard deleted items
                        <span className="text-xs text-red-500 flex items-center px-2">Permanently deleted - cannot restore</span>
                    ) : (
                        // Show Save button for normal items
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={upsertOrchestraitor}
                                        disabled={!activeTab?.hasUnsavedChanges || isSaving}
                                        className={`h-8 w-8 ${activeTab?.hasUnsavedChanges ? "text-[#4FC3F7] hover:bg-[#4FC3F7]/10" : "text-white/40"} disabled:text-white/20`}
                                    >
                                        <Save className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Save (Ctrl+S / Alt+S)</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Cancel/Discard Changes */}
                    {activeTab && !(activeTab.data as any).isHardDeleted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={commonCancel}
                                        disabled={!activeTab?.hasUnsavedChanges || !!(activeTab?.data as any)?.deletedAt}
                                        className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:text-white/20"
                                    >
                                        <RotateCcw className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {(activeTab?.data as any)?.deletedAt
                                        ? `Cannot edit deleted ${activeTab.type === constants.vscode.tab.tabTypes.note ? constants.vscode.displayNames.note : constants.vscode.displayNames.workspace}`
                                        : "Discard Changes"}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TooltipProvider>
        </div>
    );
}
