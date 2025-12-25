import {Note} from "@/types/note.types";
import {useNoteDetailStore} from "@/store/note/useNoteDetail.store";
import {useNoteGridStore} from "@/store/note/useNoteGrid.store";
import {BaseTab} from "@/types/editor/tab.types";
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
        confirmCloseTabId, 
        setConfirmCloseTabId,
    } = useEditorTabsStore();
    const { originalNoteRef, setNoteHasChanges } = useNoteDetailStore();
    const { setNotes, selectedNote,setSelectedNote } = useNoteGridStore();
    const { setSelectedWorkspace, originalWsRef, setWsHasChanges } = useWsDetailStore();

    /**
     * Update active tab ID and sync selectedNote
     * Mirrors the useEffect pattern: sync selectedNote when active tab changes
     */
    const updateActiveTabIdAndSelectedNote = (newActiveTabId: string | null, tabs?: typeof openTabs) => {
        const tabsToSearch = tabs || openTabs;
        
        setActiveTabId(newActiveTabId);
        
        if (newActiveTabId) {
            const activeTab = tabsToSearch.find((tab: BaseTab) => tab.id === newActiveTabId);
            
            if (activeTab?.type === constants.vscode.tab.tabTypes.note) {
                const noteData = activeTab.data as Note;
                
                // Initialize originalNoteRef for change tracking
                if (!originalNoteRef.current || originalNoteRef.current.id !== noteData.id) {
                    originalNoteRef.current = { ...noteData };
                    setNoteHasChanges(false); // Reset changes for newly opened note
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
                setNoteHasChanges(false);
                setSelectedNote(null);
            } else {
                originalNoteRef.current = null;
                setNoteHasChanges(false);
                setSelectedNote(null);
                originalWsRef.current = null;
                setWsHasChanges(false);
                setSelectedWorkspace(null);
            }
        } else {
            originalNoteRef.current = null;
            setNoteHasChanges(false);
            setSelectedNote(null);
            originalWsRef.current = null;
            setWsHasChanges(false);
            setSelectedWorkspace(null);
        }
    }
    const openNoteTab = (note: Note) => {
        
        // Check if tab already exists for this note
        const existingTab = openTabs.find(
            (tab: BaseTab) => tab.type === constants.vscode.tab.tabTypes.note && (tab.data as Note).id === note.id
        );

        if (existingTab) {
            // Tab already exists, just activate it
            updateActiveTabIdAndSelectedNote(existingTab.id);
        } else {
            // Create new tab
            const newTab: BaseTab = {
                id: `note-${note.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.note,
                data: note,
                title: note.name || 'Unsaved Note',
                hasUnsavedChanges: false,
            };

            
            // Update tabs first, then set active with the new tabs array
            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            
            // Pass the new tabs array to ensure we can find the tab
            updateActiveTabIdAndSelectedNote(newTab.id, newTabs);
        }
    }

    const closeTab = (tabId: string, force = false) => {
        const tab = openTabs.find((t: BaseTab) => t.id === tabId);
        
        // If tab has unsaved changes and not forcing close, show confirm dialog
        // if (tab?.hasUnsavedChanges && !force) {
        //     setConfirmCloseTabId(tabId);
        //     return;
        // }

        // If closing a note tab with negative ID (temporary note), remove it from grid
        if (tab?.type === constants.vscode.tab.tabTypes.note) {
            const noteData = tab.data as Note;
            if (noteData.id < 0) {
                setNotes(prevNotes => prevNotes.filter(note => note.id !== noteData.id));
            }
        }

        // Filter out the closed tab
        const newTabs = openTabs.filter((t: BaseTab) => t.id !== tabId);
        setOpenTabs(newTabs);

        // If closing active tab, switch to another tab
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

    const handleSetActiveTab = (tabId: string) => {
        const tab = openTabs.find((t: BaseTab) => t.id === tabId);
        if (tab) {
            updateActiveTabIdAndSelectedNote(tabId);
        }
    }

    const closeAllTabs = () => {
        // Check if any tab has unsaved changes
        const hasUnsavedChanges = openTabs.some((tab: BaseTab) => tab.hasUnsavedChanges);
        
        if (hasUnsavedChanges) {
            // TODO: Show confirm dialog for all tabs
            console.warn('Some tabs have unsaved changes');
            return;
        }

        setOpenTabs([]);
        updateActiveTabIdAndSelectedNote(null);
    }

    const markTabAsChanged = (tabId: string, hasChanges: boolean) => {
        setOpenTabs((prev: BaseTab[]) => 
            prev.map((tab: BaseTab) => 
                tab.id === tabId 
                    ? { ...tab, hasUnsavedChanges: hasChanges }
                    : tab
            )
        );
    }

    const getTabById = (tabId: string) => {
        return openTabs.find((tab: BaseTab) => tab.id === tabId);
    };

    const updateTabNote = (tabId: string, note: Note) => {
        setOpenTabs(prev =>
            prev.map(tab => {
                if (tab.id === tabId) {
                    return {
                        ...tab,
                        noteId: note.id,
                        title: note.name || 'Unsaved Note',
                        note: note,
                    };
                }
                return tab;
            })
        );
    };

    return {
        openNoteTab,
        closeTab,
        handleSetActiveTab,
        closeAllTabs,
        markTabAsChanged,
        getTabById,
        updateActiveTabIdAndSelectedNote,
        updateTabNote,
    }
}