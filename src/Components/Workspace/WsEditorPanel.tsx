/**
 * Workspace Editor Panel
 * Editor panel for workspace tabs in VSCodeLayout
 */

import React, { useEffect } from 'react';
import { Save, RotateCcw, Undo2 } from 'lucide-react';
import type { WorkspaceTab } from '@/types/editor/tab.types';
import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import { WsDetailDialogContent } from './WsDetailDialogContent';
import { useWsUIStore } from '@/store/ws/useWsUIStore';
import { useWsUIHelper } from '@/hooks/useWsUIHelper';
import { useEditorTabsStore } from '@/store/index';
import { _upsertWs, _undoDeleteWs } from '@/services/ws.service';
import { storageService } from '@/services/storage.service';
import { useSnackbar } from 'notistack';
import { useWsListHelper } from '@/hooks/useWsListHelper';
import { Ws } from '@/store/ws/useWsListStore';

interface WsEditorPanelProps {
    tab: WorkspaceTab;
}

export function WsEditorPanel({ tab }: WsEditorPanelProps) {
    const { selectedWorkspace, hasUnsavedChanges } = useWsUIStore();
    const { resetWorkspace, setSelectedWorkspace } = useWsUIHelper();
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { loadWorkspaces } = useWsListHelper();
    
    const contentRef = React.useRef<HTMLDivElement>(null);

    const [isSaving, setIsSaving] = React.useState(false);
    const [isUndoing, setIsUndoing] = React.useState(false);

    // Set selected workspace when tab is active
    useEffect(() => {
        if (tab.workspace) {
            setSelectedWorkspace(tab.workspace);
        }
    }, [tab.id]);

    // Sync hasUnsavedChanges with tab state
    useEffect(() => {
        setOpenTabs(prev => prev.map(t => 
            t.id === tab.id 
                ? { ...t, hasUnsavedChanges }
                : t
        ));
    }, [hasUnsavedChanges, tab.id]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = openTabs.find(t => t.id === tab.id)?.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab.id]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs(prev => prev.map(t => 
            t.id === tab.id 
                ? { ...t, viewState: { ...t.viewState, scrollTop } }
                : t
        ));
    };

    const handleSave = async () => {
        if (!selectedWorkspace) return;

        setIsSaving(true);
        try {
            const token = storageService.getString('token') || '';
            
            // Upsert workspace
            const savedWorkspace = await _upsertWs(token, {
                id: selectedWorkspace.id > 0 ? selectedWorkspace.id : null,
                name: selectedWorkspace.name,
                description: selectedWorkspace.description,
                userId: selectedWorkspace.userId,
            });

            if (savedWorkspace) {
                // Update tab with saved workspace data
                const updatedWorkspace: Ws = {
                    id: savedWorkspace.id,
                    name: savedWorkspace.name,
                    description: savedWorkspace.description,
                    createdAt: new Date(savedWorkspace.createdAt),
                    updatedAt: savedWorkspace.updatedAt ? new Date(savedWorkspace.updatedAt) : null,
                    deletedAt: savedWorkspace.deletedAt ? new Date(savedWorkspace.deletedAt) : null,
                    userId: savedWorkspace.userId,
                };

                setOpenTabs(prev => prev.map(t => 
                    t.id === tab.id && t.type === 'workspace'
                        ? { 
                            ...t, 
                            workspace: updatedWorkspace,
                            workspaceId: updatedWorkspace.id,
                            title: updatedWorkspace.name,
                            hasUnsavedChanges: false 
                          }
                        : t
                ));

                setSelectedWorkspace(updatedWorkspace);

                // Reload workspace grid
                await loadWorkspaces();

                enqueueSnackbar('Workspace saved successfully', { variant: 'success' });
            }
        } catch (error) {
            console.error('Failed to save workspace:', error);
            enqueueSnackbar('Failed to save workspace', { variant: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        resetWorkspace();
    };

    const handleUndo = async () => {
        if (!selectedWorkspace || !tab.isDeleted) return;

        setIsUndoing(true);
        try {
            const token = storageService.getString('token') || '';
            await _undoDeleteWs(token, selectedWorkspace.id);

            // Update tab to remove isDeleted flag
            setOpenTabs(prev => prev.map(t => 
                t.id === tab.id && t.type === 'workspace'
                    ? { ...t, isDeleted: false }
                    : t
            ));

            // Reload workspace grid to show restored workspace
            await loadWorkspaces();

            enqueueSnackbar('Workspace restored successfully', { variant: 'success' });
        } catch (error) {
            console.error('Failed to restore workspace:', error);
            enqueueSnackbar('Failed to restore workspace', { variant: 'error' });
        } finally {
            setIsUndoing(false);
        }
    };

    // Keyboard shortcut: Ctrl+S to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && !isSaving) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, isSaving, selectedWorkspace]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Toolbar */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 bg-[rgb(37,37,38)] gap-2">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {selectedWorkspace?.deletedAt ? 'Deleted' : 'Active'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ID: {selectedWorkspace?.id || '0'}
                            </span>
                        </div>
                    </div>
                </div>

                <TooltipProvider>
                    <div className="flex gap-1">
                        {tab.isDeleted ? (
                            // Show Undo button for deleted workspaces
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleUndo}
                                        disabled={isUndoing}
                                        className="h-8 w-8 text-green-500 hover:bg-green-500/10 disabled:text-white/20"
                                    >
                                        <Undo2 className="h-[18px] w-[18px]" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Restore Workspace</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            // Show Save button for normal workspaces
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleSave}
                                        disabled={!hasUnsavedChanges || isSaving}
                                        className={`h-8 w-8 ${
                                            hasUnsavedChanges
                                                ? 'text-[#4FC3F7] hover:bg-[#4FC3F7]/10' 
                                                : 'text-white/40'
                                        } disabled:text-white/20`}
                                    >
                                        <Save className="h-[18px] w-[18px]" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Save (Ctrl+S)</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancel}
                                    disabled={!hasUnsavedChanges || tab.isDeleted}
                                    className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:text-white/20"
                                >
                                    <RotateCcw className="h-[18px] w-[18px]" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{tab.isDeleted ? 'Cannot edit deleted workspace' : 'Discard Changes'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>

            {/* Content */}
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-background"
            >
                <WsDetailDialogContent />
            </div>
        </div>
    );
}
