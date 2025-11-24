/**
 * Editor Tab Context
 * Centralized state management for all editor tabs
 * Supports multiple tab types: Note, Tag, etc.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { EditorTab, NoteTab } from '../../types/editor/tab.types';
import {Note} from '@/Components/Notes/note.types';

interface EditorTabContextValue {
    // Tab state
    openTabs: EditorTab[];
    activeTabId: string | null;

    // Tab actions
    openNoteTab: (note: Note) => void;
    closeTab: (tabId: string, force?: boolean) => void;
    setActiveTab: (tabId: string) => void;
    closeAllTabs: () => void;
    
    // Unsaved changes tracking
    markTabAsChanged: (tabId: string, hasChanges: boolean) => void;
    getTabById: (tabId: string) => EditorTab | undefined;
    updateTabNote: (tabId: string, note: Note) => void;
    
    // Confirm close dialog
    confirmCloseTabId: string | null;
    setConfirmCloseTabId: (tabId: string | null) => void;
}

const EditorTabContext = createContext<EditorTabContextValue | null>(null);

export function EditorTabProvider({ children }: { children: React.ReactNode }) {
    const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);

    const openNoteTab = useCallback((note: Note) => {
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
    }, [openTabs]);

    const closeTab = useCallback((tabId: string, force = false) => {
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
    }, [openTabs, activeTabId]);

    const handleSetActiveTab = useCallback((tabId: string) => {
        const tab = openTabs.find(t => t.id === tabId);
        if (tab) {
            setActiveTabId(tabId);
        }
    }, [openTabs]);

    const closeAllTabs = useCallback(() => {
        // Check if any tab has unsaved changes
        const hasUnsavedChanges = openTabs.some(tab => tab.hasUnsavedChanges);
        
        if (hasUnsavedChanges) {
            // TODO: Show confirm dialog for all tabs
            console.warn('Some tabs have unsaved changes');
            return;
        }

        setOpenTabs([]);
        setActiveTabId(null);
    }, [openTabs]);

    const markTabAsChanged = useCallback((tabId: string, hasChanges: boolean) => {
        setOpenTabs(prev => 
            prev.map(tab => 
                tab.id === tabId 
                    ? { ...tab, hasUnsavedChanges: hasChanges }
                    : tab
            )
        );
    }, []);

    const getTabById = useCallback((tabId: string) => {
        return openTabs.find(tab => tab.id === tabId);
    }, [openTabs]);

    const updateTabNote = useCallback((tabId: string, note: Note) => {
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
    }, []);

    const value = {
        openTabs,
        activeTabId,
        openNoteTab,
        closeTab,
        setActiveTab: handleSetActiveTab,
        closeAllTabs,
        markTabAsChanged,
        getTabById,
        updateTabNote,
        confirmCloseTabId,
        setConfirmCloseTabId,
    };

    return (
        <EditorTabContext.Provider value={value}>
            {children}
        </EditorTabContext.Provider>
    );
}

export function useEditorTabs() {
    const context = useContext(EditorTabContext);
    if (!context) {
        throw new Error('useEditorTabs must be used within EditorTabProvider');
    }
    return context;
}
