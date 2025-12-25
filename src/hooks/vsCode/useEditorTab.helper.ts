import {Note} from "@/types/note.types";
import {useNoteDetailStore} from "@/store/note/useNoteDetail.store";
import {useNoteGridStore} from "@/store/note/useNoteGrid.store";
import {BaseTab, TabType} from "@/types/editor/tab.types";
import {useEditorTabsStore} from "@/store/index";
import { constants } from '@/utils/constants';
import { useWsDetailStore } from '@/store/ws/useWsDetail.store';
import { Ws } from '@/store/ws/useWs.store';


export const useEditorTabHelper = () => {
    const { 
        openTabs, 
        setOpenTabs, 
        activeTabId, 
        setActiveTabId, 
    } = useEditorTabsStore();
    const { originalNoteRef } = useNoteDetailStore();
    const { setNotes, selectedNote,setSelectedNote } = useNoteGridStore();
    const { setSelectedWorkspace, originalWsRef, setWsHasChanges } = useWsDetailStore();

    /**
     * Update active tab ID and sync selectedNote
     * Mirrors the useEffect pattern: sync selectedNote when active tab changes
     */
    const updateActiveTabIdAndSelectedNote = (newActiveTabId: string | null, tabs?: BaseTab[]) => {
        const tabsToSearch = tabs || openTabs;
        
        setActiveTabId(newActiveTabId);
        
        if (newActiveTabId) {
            const activeTab = tabsToSearch.find((tab: BaseTab) => tab.id === newActiveTabId);
            
            if (activeTab?.type === constants.vscode.tab.tabTypes.note) {
                const noteData = activeTab.data as Note;
                
                // Initialize originalNoteRef for change tracking
                if (!originalNoteRef.current || originalNoteRef.current.id !== noteData.id) {
                    originalNoteRef.current = { ...noteData };
                }
                
                setSelectedNote(noteData);
                
                // Clear workspace state when switching to note
                originalWsRef.current = null;
                setWsHasChanges(false);
                setSelectedWorkspace(null);
            } else if (activeTab?.type === constants.vscode.tab.tabTypes.workspace) {
                const wsData = activeTab.data as Ws;
                
                // Initialize originalWsRef for change tracking
                if (!originalWsRef.current || originalWsRef.current.id !== wsData.id) {
                    originalWsRef.current = { ...wsData };
                    setWsHasChanges(false); // Reset changes for newly opened workspace
                }
                
                setSelectedWorkspace(wsData);
                
                // Clear note state when switching to workspace
                originalNoteRef.current = null;
                setSelectedNote(null);
            } else {
                originalNoteRef.current = null;
                setSelectedNote(null);
                originalWsRef.current = null;
                setWsHasChanges(false);
                setSelectedWorkspace(null);
            }
        } else {
            originalNoteRef.current = null;
            setSelectedNote(null);
            originalWsRef.current = null;
            setWsHasChanges(false);
            setSelectedWorkspace(null);
        }
    }
    // ================================================================
    // OPEN TAB - Generic handler for multiple tab types
    // ================================================================
    const openTab = (data: Note | Ws, tabType?: string) => {
        const type = tabType || (('workspaceId' in data) ? constants.vscode.tab.tabTypes.workspace : constants.vscode.tab.tabTypes.note);
        
        // ===================================
        // 1. Check for existing tab
        // ===================================
        let existingTab: BaseTab | undefined;
        
        if (type === constants.vscode.tab.tabTypes.note) {
            const noteData = data as Note;
            existingTab = openTabs.find(
                (tab: BaseTab) => tab.type === constants.vscode.tab.tabTypes.note && (tab.data as Note).id === noteData.id
            );
        } else if (type === constants.vscode.tab.tabTypes.workspace) {
            const wsData = data as Ws;
            existingTab = openTabs.find(
                (tab: BaseTab) => tab.type === constants.vscode.tab.tabTypes.workspace && (tab.data as Ws).id === wsData.id
            );
        }
        // Add more tab types here in the future...
        
        // ===================================
        // 2. Activate existing or create new
        // ===================================
        if (existingTab) {
            // Tab already exists, just activate it
            updateActiveTabIdAndSelectedNote(existingTab.id);
        } else {
            // ===================================
            // 3. Create new tab based on type
            // ===================================
            let newTab: BaseTab;
            
            if (type === constants.vscode.tab.tabTypes.note) {
                const noteData = data as Note;
                newTab = {
                    id: `note-${noteData.id}-${Date.now()}`,
                    type: constants.vscode.tab.tabTypes.note,
                    data: noteData,
                    title: noteData.name || constants.vscode.tabTitles.unsavedNote,
                    hasUnsavedChanges: false,
                };
            } else if (type === constants.vscode.tab.tabTypes.workspace) {
                const wsData = data as Ws;
                newTab = {
                    id: `workspace-${wsData.id}-${Date.now()}`,
                    type: constants.vscode.tab.tabTypes.workspace,
                    data: wsData,
                    title: wsData.name || constants.vscode.tabTitles.unsavedWorkspace,
                    hasUnsavedChanges: false,
                };
            } else {
                // Fallback for unknown types (extend this later)
                newTab = {
                    id: `unknown-${Date.now()}`,
                    type: type as TabType,
                    data: data,
                    title: constants.vscode.tabTitles.unknownTab,
                    hasUnsavedChanges: false,
                };
            }
            
            // ===================================
            // 4. Add to tabs and activate
            // ===================================
            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            updateActiveTabIdAndSelectedNote(newTab.id, newTabs);
        }
    }

    // ================================================================
    // CLOSE TAB - Generic cleanup handler for multiple tab types
    // ================================================================
    const closeTab = (tabId: string, force = false) => {
        const tab = openTabs.find((t: BaseTab) => t.id === tabId);
        
        if (!tab) return;
        
        // ===================================
        // 1. Type-specific cleanup logic
        // ===================================
        if (tab.type === constants.vscode.tab.tabTypes.note) {
            // Cleanup for Note tabs
            const noteData = tab.data as Note;
            
            // Remove temporary notes (negative ID) from grid
            if (noteData.id < 0) {
                setNotes(prevNotes => prevNotes.filter(note => note.id !== noteData.id));
            }
            
            // Additional note-specific cleanup can go here...
            
        } else if (tab.type === constants.vscode.tab.tabTypes.workspace) {
            // Cleanup for Workspace tabs
            const wsData = tab.data as Ws;
            
            // Remove temporary workspaces (negative ID) if needed
            if (wsData.id < 0) {
                // Add workspace cleanup logic here when needed
                // Example: setWorkspaces(prev => prev.filter(ws => ws.id !== wsData.id));
            }
            
            // Additional workspace-specific cleanup can go here...
        }
        // Add more tab type cleanup handlers here in the future...

        // ===================================
        // 2. Remove tab from list
        // ===================================
        const newTabs = openTabs.filter((t: BaseTab) => t.id !== tabId);
        setOpenTabs(newTabs);

        // ===================================
        // 3. Handle active tab switching
        // ===================================
        if (activeTabId === tabId) {
            if (newTabs.length > 0) {
                // Switch to the last tab
                updateActiveTabIdAndSelectedNote(newTabs[newTabs.length - 1].id, newTabs);
            } else {
                // No tabs left
                updateActiveTabIdAndSelectedNote(null, newTabs);
            }
        }
    }

    const getTabById = (tabId: string) => {
        return openTabs.find((tab: BaseTab) => tab.id === tabId);
    };

    return {
        openTab,
        closeTab,
        getTabById,
        updateActiveTabIdAndSelectedNote,
    }
}