import {Note} from "@/types/note.types";
import {useEditorTabsStore} from "../store/editor/EditorTabStore";
import {NoteTab} from "@/components/Editor";


export const useEditorTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId, confirmCloseTabId, setConfirmCloseTabId } = useEditorTabsStore();

    const updateActiveTabIdAnd = (newActiveTabId: string | null) => {
        
    }
    const openNoteTab = (note: Note) => {
        console.log('📝 EditorTabContext - openNoteTab called:', note);
        console.log('📝 EditorTabContext - Current openTabs:', openTabs);
        
        // Check if tab already exists for this note
        const existingTab = openTabs.find(
            tab => tab.type === 'note' && tab.noteId === note.noteId
        ) as NoteTab | undefined;

        if (existingTab) {
            // Tab already exists, just activate it
            console.log('📝 EditorTabContext - Tab exists, activating:', existingTab.id);
            setActiveTabId(existingTab.id);
        } else {
            // Create new tab
            const newTab: NoteTab = {
                id: `note-${note.noteId}-${Date.now()}`,
                type: 'note',
                noteId: note.noteId,
                title: note.name || 'Untitled Note',
                note: note,
                hasUnsavedChanges: false,
            };

            console.log('📝 EditorTabContext - Creating new tab:', newTab);
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    }

    const closeTab = (tabId: string, force = false) => {
        const tab = openTabs.find(t => t.id === tabId);
        
        // If tab has unsaved changes and not forcing close, show confirm dialog
        if (tab?.hasUnsavedChanges && !force) {
            setConfirmCloseTabId(tabId);
            return;
        }

        // Close the tab
        setOpenTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Switch to the last tab
                    setActiveTabId(newTabs[newTabs.length - 1].id);
                } else {
                    // No tabs left
                    setActiveTabId(null);
                }
            }

            return newTabs;
        });
    }

    const handleSetActiveTab = (tabId: string) => {
        const tab = openTabs.find(t => t.id === tabId);
        if (tab) {
            setActiveTabId(tabId);
        }
    }

    const closeAllTabs = () => {
        // Check if any tab has unsaved changes
        const hasUnsavedChanges = openTabs.some(tab => tab.hasUnsavedChanges);
        
        if (hasUnsavedChanges) {
            // TODO: Show confirm dialog for all tabs
            console.warn('Some tabs have unsaved changes');
            return;
        }

        setOpenTabs([]);
        setActiveTabId(null);
    }

    const markTabAsChanged = (tabId: string, hasChanges: boolean) => {
        setOpenTabs(prev => 
            prev.map(tab => 
                tab.id === tabId 
                    ? { ...tab, hasUnsavedChanges: hasChanges }
                    : tab
            )
        );
    }

    const getTabById = (tabId: string) => {
        return openTabs.find(tab => tab.id === tabId);
    };

    const updateTabNote = (tabId: string, note: Note) => {
        console.log('🔄 EditorTabContext - updateTabNote:', { tabId, note });
        setOpenTabs(prev => 
            prev.map(tab => {
                if (tab.id === tabId && tab.type === 'note') {
                    return {
                        ...tab,
                        noteId: note.noteId,
                        title: note.name || 'Untitled Note',
                        note: note,
                    } as NoteTab;
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