/**
 * Notes UI Context
 * Minimal UI state management for notes feature
 * Server state is handled by React Query hooks
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { Note } from '../types/note.types';

interface DialogProps {
    open: boolean;
    loading: boolean;
}

interface TabItem {
    id: string;
    noteId: number;
    title: string;
    note: Note;
}

interface NoteUIContextValue {
    // Dialog state
    selectedNote: Note | null;
    isDialogOpen: boolean;
    hasUnsavedChanges: boolean;
    openDialog: (note: Note) => void;
    closeDialog: () => void;
    updateSelectedNote: (updatedNote: Partial<Note>) => void;
    markAsSaved: () => void;
    resetChanges: () => void;
    setSelectedNote: (note: Note | null) => void; // For VSCode layout panel

    // Search UI state
    searchText: string;
    setSearchText: (text: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement>;

    // Grid UI state
    loadingMasterGrid: boolean;
    setLoadingMasterGrid: (loading: boolean) => void;
    refreshMasterGrid: boolean;
    setRefreshMasterGrid: (refresh: boolean) => void;
    apiRef: React.RefObject<any>; // Generic ref for grid API

    // Row selection state
    selectedRowIds: number[];
    setSelectedRowIds: (ids: number[]) => void;

    // Pagination UI state
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;

    // Container refs
    noteMasterContainerRef: React.RefObject<HTMLDivElement>;
    noteDetailDialogRef: React.RefObject<HTMLDivElement>;

    // Dialog styling
    noteDetailDialogSxProps: React.CSSProperties;
    setNoteDetailDialogSxProps: (sx: React.CSSProperties) => void;

    // Preview dialog state
    previewDialogProps: DialogProps;
    setPreviewDialogProps: (props: DialogProps) => void;

    // Tab management
    openTabs: TabItem[];
    activeTabId: string | null;
    openTab: (note: Note) => void;
    closeTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    closeAllTabs: () => void;
}

const NoteUIContext = createContext<NoteUIContextValue | null>(null);

export function NoteUIProvider({ children }: { children: React.ReactNode }) {
    // Dialog state
    const [selectedNoteState, setSelectedNoteState] = useState<Note | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const originalNoteRef = useRef<Note | null>(null);

    // Wrapper for setSelectedNote that also initializes originalNoteRef
    const setSelectedNote = useCallback((note: Note | null) => {
        console.log('🎯 setSelectedNote called:', note);
        setSelectedNoteState(note);
        
        // Initialize originalNoteRef when a note is selected
        if (note) {
            // Only set originalNoteRef if it's null or different note
            if (!originalNoteRef.current || originalNoteRef.current.noteId !== note.noteId) {
                console.log('📌 Initializing originalNoteRef:', note);
                originalNoteRef.current = { ...note };
                setHasUnsavedChanges(false); // Reset changes for new note
            }
        } else {
            // Clear originalNoteRef when note is deselected
            console.log('🗑️ Clearing originalNoteRef');
            originalNoteRef.current = null;
            setHasUnsavedChanges(false);
        }
    }, []);

    // Search UI state
    const [searchText, setSearchText] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Grid UI state
    const [loadingMasterGrid, setLoadingMasterGrid] = useState(false);
    const [refreshMasterGrid, setRefreshMasterGrid] = useState(false);
    const apiRef = useRef<any>(null); // Generic ref for grid API

    // Row selection state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

    // Pagination UI state
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    // Container refs
    const noteMasterContainerRef = useRef<HTMLDivElement>(null);
    const noteDetailDialogRef = useRef<HTMLDivElement>(null);

    // Dialog styling
    const [noteDetailDialogSxProps, setNoteDetailDialogSxProps] = useState<React.CSSProperties>({});

    // Preview dialog state
    const [previewDialogProps, setPreviewDialogProps] = useState<DialogProps>({
        open: false,
        loading: false,
    });

    // Tab state
    const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    const openDialog = useCallback((note: Note) => {
        console.log('🚪 openDialog called:', note);
        setSelectedNote(note); // This will also set originalNoteRef via the wrapper
        
        // For new notes, set hasUnsavedChanges based on existing content
        const isNewNote = note.noteId === 0;
        if (isNewNote) {
            const hasContent = note.name?.trim() || 
                             note.description?.trim() || 
                             (note.tags && note.tags.length > 0) ||
                             note.type;
            setHasUnsavedChanges(!!hasContent);
        } else {
            setHasUnsavedChanges(false); // Reset change tracking for existing notes
        }
        
        setIsDialogOpen(true);
    }, [setSelectedNote]);

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            setSelectedNote(null);
            originalNoteRef.current = null;
            setHasUnsavedChanges(false);
        }, 200); // After animation
    };

    const updateSelectedNote = (updatedNote: Partial<Note>) => {
        console.log('🔄 updateSelectedNote called with:', updatedNote);
        
        setSelectedNoteState((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...updatedNote };
            
            console.log('📝 Previous state:', prev);
            console.log('✨ Updated state:', updated);
            console.log('📌 Original ref:', originalNoteRef.current);
            
            // Check if this was originally a new note (originalRef has noteId === 0)
            const wasNewNote = originalNoteRef.current?.noteId === 0;
            const isNowSaved = updated.noteId > 0;
            
            // If this was a new note and now has an ID, update the original reference
            if (wasNewNote && isNowSaved) {
                originalNoteRef.current = { ...updated };
                setHasUnsavedChanges(false);
                return updated;
            }
            
            // For new notes that are still unsaved (noteId === 0)
            if (updated.noteId === 0) {
                // For new notes, show changes if there's any meaningful content
                const hasContent = updated.name?.trim() || 
                                 updated.description?.trim() || 
                                 (updated.tags && updated.tags.length > 0) ||
                                 updated.type;
                
                console.log('📄 New note content check:', {
                    name: updated.name,
                    description: updated.description,
                    tags: updated.tags,
                    type: updated.type,
                    hasContent
                });
                
                setHasUnsavedChanges(!!hasContent);
            } else {
                // For existing notes, compare with original
                if (originalNoteRef.current) {
                    // Compare all relevant fields, not just updated ones
                    const fieldsToCheck: (keyof Note)[] = ['name', 'description', 'type', 'tags', 'isArchived'];
                    
                    const hasChanges = fieldsToCheck.some((key) => {
                        const originalValue = originalNoteRef.current![key];
                        const updatedValue = updated[key];
                        
                        // Deep comparison for arrays (tags)
                        if (Array.isArray(originalValue) && Array.isArray(updatedValue)) {
                            // Sort and compare tag IDs
                            const originalTagIds = originalValue.map((t: any) => t.tagId || t.id).sort();
                            const updatedTagIds = updatedValue.map((t: any) => t.tagId || t.id).sort();
                            const isDifferent = JSON.stringify(originalTagIds) !== JSON.stringify(updatedTagIds);
                            console.log(`  🏷️  ${key} comparison:`, { originalTagIds, updatedTagIds, isDifferent });
                            return isDifferent;
                        }
                        
                        // For other values, direct comparison
                        const isDifferent = originalValue !== updatedValue;
                        console.log(`  📊 ${key} comparison:`, { originalValue, updatedValue, isDifferent });
                        return isDifferent;
                    });
                    
                    console.log('✅ Existing note change check result:', {
                        hasChanges,
                        checkedFields: fieldsToCheck
                    });
                    
                    setHasUnsavedChanges(hasChanges);
                }
            }
            
            return updated;
        });
    };

    const markAsSaved = () => {
        // Update original reference with current state and clear changes
        if (selectedNoteState) {
            originalNoteRef.current = { ...selectedNoteState };
            setHasUnsavedChanges(false);
        }
    };

    const resetChanges = () => {
        // Restore to original state
        if (originalNoteRef.current) {
            setSelectedNoteState({ ...originalNoteRef.current });
            setHasUnsavedChanges(false);
        }
    };

    // Tab management functions
    const openTab = useCallback((note: Note) => {
        const tabId = `tab-${note.noteId}-${Date.now()}`;

        // Check if tab already exists
        const existingTab = openTabs.find(tab => tab.noteId === note.noteId);

        if (existingTab) {
            // Tab already exists, just switch to it
            setActiveTabId(existingTab.id);
            setSelectedNote(note);
        } else {
            // Create new tab
            const newTab: TabItem = {
                id: tabId,
                noteId: note.noteId,
                title: note.name || 'Untitled',
                note: note
            };

            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabId(tabId);
            setSelectedNote(note);
        }
    }, [openTabs]);

    const closeTab = useCallback((tabId: string) => {
        setOpenTabs(prev => {
            const newTabs = prev.filter(tab => tab.id !== tabId);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Switch to the last tab
                    const newActiveTab = newTabs[newTabs.length - 1];
                    setActiveTabId(newActiveTab.id);
                    setSelectedNote(newActiveTab.note);
                } else {
                    // No tabs left
                    setActiveTabId(null);
                    setSelectedNote(null);
                }
            }

            return newTabs;
        });
    }, [activeTabId]);

    const handleSetActiveTab = useCallback((tabId: string) => {
        const tab = openTabs.find(t => t.id === tabId);
        if (tab) {
            setActiveTabId(tabId);
            setSelectedNote(tab.note);
        }
    }, [openTabs]);

    const closeAllTabs = useCallback(() => {
        setOpenTabs([]);
        setActiveTabId(null);
        setSelectedNote(null);
    }, [setSelectedNote]);

    const value = {
        // Dialog state
        selectedNote: selectedNoteState,
        isDialogOpen,
        hasUnsavedChanges,
        openDialog,
        closeDialog,
        updateSelectedNote,
        markAsSaved,
        resetChanges,
        setSelectedNote, // Expose for VSCode layout panel

        // Search UI state
        searchText,
        setSearchText,
        searchInputRef,

        // Grid UI state
        loadingMasterGrid,
        setLoadingMasterGrid,
        refreshMasterGrid,
        setRefreshMasterGrid,
        apiRef,

        // Row selection state
        selectedRowIds,
        setSelectedRowIds,

        // Pagination UI state
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,

        // Container refs
        noteMasterContainerRef,
        noteDetailDialogRef,

        // Dialog styling
        noteDetailDialogSxProps,
        setNoteDetailDialogSxProps,

        // Preview dialog state
        previewDialogProps,
        setPreviewDialogProps,

        // Tab management
        openTabs,
        activeTabId,
        openTab,
        closeTab,
        setActiveTab: handleSetActiveTab,
        closeAllTabs,
    };

    return (
        <NoteUIContext.Provider value={value}>
            {children}
        </NoteUIContext.Provider>
    );
}

export function useNoteUI() {
    const context = useContext(NoteUIContext);
    if (!context) {
        throw new Error('useNoteUI must be used within NoteUIProvider');
    }
    return context;
}