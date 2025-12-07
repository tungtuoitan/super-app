/**
 * Workspace Tab Helper
 * Helper functions for managing workspace editor tabs
 */

import { Ws } from '@/store/ws/useWsListStore';
import { useEditorTabsStore } from '@/Components/Editor';
import { WorkspaceTab } from '@/types/editor/tab.types';

export const useWsTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabsStore();

    /**
     * Open workspace in editor tab
     * If tab already exists, activate it; otherwise create new tab
     */
    const openWorkspaceTab = (workspace: Ws) => {
        console.log('🏢 WsTabHelper - openWorkspaceTab called:', workspace);
        console.log('🏢 WsTabHelper - Current openTabs:', openTabs);

        // Check if tab already exists for this workspace
        const existingTab = openTabs.find(
            tab => tab.type === 'workspace' && (tab as WorkspaceTab).workspaceId === workspace.id
        );

        if (existingTab) {
            // Tab already exists, just activate it
            console.log('🏢 WsTabHelper - Tab exists, activating:', existingTab.id);
            setActiveTabId(existingTab.id);
        } else {
            // Create new workspace tab
            const newTab: WorkspaceTab = {
                id: `workspace-tab-${workspace.id}-${Date.now()}`,
                type: 'workspace',
                workspaceId: workspace.id,
                title: workspace.name || 'Untitled Workspace',
                workspace: workspace,
                hasUnsavedChanges: false,
            };

            console.log('🏢 WsTabHelper - Creating new tab:', newTab);
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    };

    /**
     * Close workspace tab
     */
    const closeWorkspaceTab = (tabId: string) => {
        console.log('🏢 WsTabHelper - closeWorkspaceTab:', tabId);
        
        setOpenTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Switch to the last tab
                    const lastTab = newTabs[newTabs.length - 1];
                    setActiveTabId(lastTab.id);
                } else {
                    setActiveTabId(null);
                }
            }

            return newTabs;
        });
    };

    /**
     * Update workspace in all tabs
     * When workspace is updated, sync it across all open tabs
     */
    const updateWorkspaceInTabs = (workspaceId: number, updatedWorkspace: Partial<Ws>) => {
        console.log('🏢 WsTabHelper - updateWorkspaceInTabs:', workspaceId, updatedWorkspace);
        
        setOpenTabs(prev => prev.map(tab => {
            if (tab.type === 'workspace' && (tab as WorkspaceTab).workspaceId === workspaceId) {
                const wsTab = tab as WorkspaceTab;
                return {
                    ...wsTab,
                    workspace: { ...wsTab.workspace, ...updatedWorkspace },
                    title: updatedWorkspace.name || wsTab.title,
                } as WorkspaceTab;
            }
            return tab;
        }));
    };

    /**
     * Mark workspace tab as having unsaved changes
     */
    const markWorkspaceTabUnsaved = (tabId: string, hasChanges: boolean) => {
        setOpenTabs(prev => prev.map(tab => 
            tab.id === tabId ? { ...tab, hasUnsavedChanges: hasChanges } : tab
        ));
    };

    return {
        openWorkspaceTab,
        closeWorkspaceTab,
        updateWorkspaceInTabs,
        markWorkspaceTabUnsaved,
    };
};
