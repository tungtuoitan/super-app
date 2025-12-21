import {Note} from "@/types/note.types";
import {useNoteUIStore} from "../store/note/useNoteUI.store";
import {useNoteGridPanelStore} from "../store/note/useNoteGridPanel.store";
import {BaseTab} from "@/types/editor/tab.types";
import {useEditorTabsStore} from "../store";


export const useEditorTabHelper = () => {
    const { 
        openTabs, 
        setOpenTabs, 
        activeTabId, 
        setActiveTabId, 
        confirmCloseTabId, 
        setConfirmCloseTabId,
    } = useEditorTabsStore();
    const { setSelectedNote, originalNoteRef, setHasUnsavedChanges } = useNoteUIStore();
    const { setNotes } = useNoteGridPanelStore();

    /**
     * Update active tab ID and sync selectedNote
     * Mirrors the useEffect pattern: sync selectedNote when active tab changes
     */
    const updateActiveTabIdAndSelectedNote = (newActiveTabId: string | null, tabs?: typeof openTabs) => {
        const tabsToSearch = tabs || openTabs;
        
        console.log('🔄 updateActiveTabIdAndSelectedNote:', { 
            newActiveTabId, 
            tabsCount: tabsToSearch.length,
            tabs: tabsToSearch 
        });
        
        setActiveTabId(newActiveTabId);
        
        if (newActiveTabId) {
            const activeTab = tabsToSearch.find((tab: BaseTab) => tab.id === newActiveTabId);
            console.log('🔍 Found active tab:', activeTab);
            
            if (activeTab?.type === 'note') {
                const noteData = activeTab.data as Note;
                console.log('✅ Setting selectedNote:', noteData);
                
                // Initialize originalNoteRef for change tracking
                if (!originalNoteRef.current || originalNoteRef.current.id !== noteData.id) {
                    console.log('📌 Initializing originalNoteRef in EditorTabHelper:', noteData);
                    originalNoteRef.current = { ...noteData };
                    setHasUnsavedChanges(false); // Reset changes for newly opened note
                }
                
                setSelectedNote(noteData);
            } else {
                console.log('❌ No note tab found, clearing selectedNote');
                originalNoteRef.current = null;
                setHasUnsavedChanges(false);
                setSelectedNote(null);
            }
        } else {
            console.log('🚫 No active tab ID, clearing selectedNote');
            originalNoteRef.current = null;
            setHasUnsavedChanges(false);
            setSelectedNote(null);
        }
    }
    const openNoteTab = (note: Note) => {
        console.log('📝 EditorTabContext - openNoteTab called:', note);
        console.log('📝 EditorTabContext - Current openTabs:', openTabs);
        
        // Check if tab already exists for this note
        const existingTab = openTabs.find(
            (tab: BaseTab) => tab.type === 'note' && (tab.data as Note).id === note.id
        );

        if (existingTab) {
            // Tab already exists, just activate it
            console.log('📝 EditorTabContext - Tab exists, activating:', existingTab.id);
            updateActiveTabIdAndSelectedNote(existingTab.id);
        } else {
            // Create new tab
            const newTab: BaseTab = {
                id: `note-${note.id}-${Date.now()}`,
                type: 'note',
                data: note,
                title: note.name || 'Unsaved Note',
                hasUnsavedChanges: false,
            };

            console.log('📝 EditorTabContext - Creating new tab:', newTab);
            
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
        if (tab?.type === 'note') {
            const noteData = tab.data as Note;
            if (noteData.id < 0) {
                console.log('🗑️ Removing temporary note from grid:', noteData.id);
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
        console.log('🔄 EditorTabContext - updateTabNote:', { tabId, note });
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((tab: BaseTab) => {
                if (tab.id === tabId && tab.type === 'note') {
                    return {
                        ...tab,
                        data: note,
                        title: note.name || 'Unsaved Note',
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
        updateTabNote,
    }
}