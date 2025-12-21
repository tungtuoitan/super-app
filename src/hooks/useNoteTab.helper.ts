import { Note } from '@/types/note.types';
import { useNoteTabStore } from '../store/note/useNoteTab.store';

export const useNoteTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId, confirmCloseTabId, setConfirmCloseTabId } = useNoteTabStore();

    const openTab = (note: Note) => {
        console.log('📝 NoteTabHelper - openTab called:', note);
        console.log('📝 NoteTabHelper - Current openTabs:', openTabs);

        // Check if tab already exists for this note
        const existingTab = openTabs.find(tab => 
            tab.type === 'note' && (tab.data as Note).id === note.id
        );

        if (existingTab) {
            // Tab already exists, just activate it
            console.log('📝 NoteTabHelper - Tab exists, activating:', existingTab.id);
            setActiveTabId(existingTab.id);
        } else {
            // Create new tab
            const newTab = {
                id: `note-tab-${note.id}-${Date.now()}`,
                type: 'note' as const,
                data: note,
                title: note.name || 'Unsaved Note',
                hasUnsavedChanges: false,
            };

            console.log('📝 NoteTabHelper - Creating new tab:', newTab);
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
    };

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
    };

    const setActiveTab = (tabId: string) => {
        const tab = openTabs.find(t => t.id === tabId);
        if (tab) {
            setActiveTabId(tabId);
        }
    };

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
    };

    const markTabAsChanged = (tabId: string, hasChanges: boolean) => {
        setOpenTabs(prev =>
            prev.map(tab =>
                tab.id === tabId
                    ? { ...tab, hasUnsavedChanges: hasChanges }
                    : tab
            )
        );
    };

    const getTabById = (tabId: string) => {
        return openTabs.find(tab => tab.id === tabId);
    };

    const updateTabNote = (tabId: string, note: Note) => {
        console.log('🔄 NoteTabHelper - updateTabNote:', { tabId, note });
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

    const getActiveTab = () => {
        if (!activeTabId) return null;
        return openTabs.find(tab => tab.id === activeTabId);
    };

    return {
        openTab,
        closeTab,
        setActiveTab,
        closeAllTabs,
        markTabAsChanged,
        getTabById,
        updateTabNote,
        getActiveTab,
        openTabs,
        activeTabId,
        confirmCloseTabId,
        setConfirmCloseTabId,
    };
};
