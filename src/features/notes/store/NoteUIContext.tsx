/**
 * Notes UI Context
 * Minimal UI state management for notes feature
 * Server state is handled by React Query hooks
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { GridApi } from '@mui/x-data-grid';
import type { SxProps } from '@mui/material';
import type { Note } from '../types/note.types';

interface DialogProps {
    open: boolean;
    loading: boolean;
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
    apiRef: React.RefObject<GridApi>;

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
    noteDetailDialogSxProps: SxProps;
    setNoteDetailDialogSxProps: (sx: SxProps) => void;

    // Preview dialog state
    previewDialogProps: DialogProps;
    setPreviewDialogProps: (props: DialogProps) => void;
}

const NoteUIContext = createContext<NoteUIContextValue | null>(null);

export function NoteUIProvider({ children }: { children: React.ReactNode }) {
    // Dialog state
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const originalNoteRef = useRef<Note | null>(null);

    // Search UI state
    const [searchText, setSearchText] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Grid UI state
    const [loadingMasterGrid, setLoadingMasterGrid] = useState(false);
    const [refreshMasterGrid, setRefreshMasterGrid] = useState(false);
    const apiRef = useRef<GridApi>(null!);

    // Row selection state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

    // Pagination UI state
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    // Container refs
    const noteMasterContainerRef = useRef<HTMLDivElement>(null);
    const noteDetailDialogRef = useRef<HTMLDivElement>(null);

    // Dialog styling
    const [noteDetailDialogSxProps, setNoteDetailDialogSxProps] = useState<SxProps>({});

    // Preview dialog state
    const [previewDialogProps, setPreviewDialogProps] = useState<DialogProps>({
        open: false,
        loading: false,
    });

    const openDialog = useCallback((note: Note) => {
        setSelectedNote(note);
        originalNoteRef.current = { ...note }; // Store original state
        
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
    }, []);

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            setSelectedNote(null);
            originalNoteRef.current = null;
            setHasUnsavedChanges(false);
        }, 200); // After animation
    };

    const updateSelectedNote = (updatedNote: Partial<Note>) => {
        setSelectedNote((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...updatedNote };
            
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
                
                console.log('New note content check:', {
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
                    const hasChanges = Object.keys(updatedNote).some((key) => {
                        const originalValue = originalNoteRef.current![key as keyof Note];
                        const updatedValue = updated[key as keyof Note];
                        
                        // Deep comparison for arrays (tags)
                        if (Array.isArray(originalValue) && Array.isArray(updatedValue)) {
                            return JSON.stringify(originalValue.sort()) !== JSON.stringify(updatedValue.sort());
                        }
                        
                        return originalValue !== updatedValue;
                    });
                    
                    setHasUnsavedChanges(hasChanges);
                }
            }
            
            return updated;
        });
    };

    const markAsSaved = () => {
        // Update original reference with current state and clear changes
        if (selectedNote) {
            originalNoteRef.current = { ...selectedNote };
            setHasUnsavedChanges(false);
        }
    };

    const resetChanges = () => {
        // Restore to original state
        if (originalNoteRef.current) {
            setSelectedNote({ ...originalNoteRef.current });
            setHasUnsavedChanges(false);
        }
    };

    const value = {
        // Dialog state
        selectedNote,
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