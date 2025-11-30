/**
 * Notes UI Context
 * Minimal UI state management for notes feature
 * Server state is handled by React Query hooks
 * Tab management is handled by NoteTabStore
 */

import {Note} from '@/types/note.types';
import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from 'react';

interface DialogProps {
    open: boolean;
    loading: boolean;
}

export interface NoteUIContextData {
    // Dialog state
    selectedNote: Note | null;
    isDialogOpen: boolean;
    hasUnsavedChanges: boolean;
    setSelectedNote: Dispatch<SetStateAction<Note | null>>;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
    setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;

    // Original note ref for change tracking
    originalNoteRef: React.MutableRefObject<Note | null>;

    // Search UI state
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;
    searchInputRef: React.RefObject<HTMLInputElement>;

    // Grid UI state
    loadingMasterGrid: boolean;
    setLoadingMasterGrid: Dispatch<SetStateAction<boolean>>;
    refreshMasterGrid: boolean;
    setRefreshMasterGrid: Dispatch<SetStateAction<boolean>>;
    apiRef: React.RefObject<any>;

    // Row selection state
    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;

    // Pagination UI state
    currentPage: number;
    setCurrentPage: Dispatch<SetStateAction<number>>;
    pageSize: number;
    setPageSize: Dispatch<SetStateAction<number>>;

    // Container refs
    noteMasterContainerRef: React.RefObject<HTMLDivElement>;
    noteDetailDialogRef: React.RefObject<HTMLDivElement>;

    // Dialog styling
    noteDetailDialogSxProps: React.CSSProperties;
    setNoteDetailDialogSxProps: Dispatch<SetStateAction<React.CSSProperties>>;

    // Preview dialog state
    previewDialogProps: DialogProps;
    setPreviewDialogProps: Dispatch<SetStateAction<DialogProps>>;
}

export const noteUIContextDefaultValue: NoteUIContextData = {
    // Dialog state
    selectedNote: null,
    isDialogOpen: false,
    hasUnsavedChanges: false,
    setSelectedNote: () => {},
    setIsDialogOpen: () => {},
    setHasUnsavedChanges: () => {},
    originalNoteRef: { current: null },

    // Search UI state
    searchText: '',
    setSearchText: () => {},
    searchInputRef: { current: null },

    // Grid UI state
    loadingMasterGrid: false,
    setLoadingMasterGrid: () => {},
    refreshMasterGrid: false,
    setRefreshMasterGrid: () => {},
    apiRef: { current: null },

    // Row selection state
    selectedRowIds: [],
    setSelectedRowIds: () => {},

    // Pagination UI state
    currentPage: 0,
    setCurrentPage: () => {},
    pageSize: 100,
    setPageSize: () => {},

    // Container refs
    noteMasterContainerRef: { current: null },
    noteDetailDialogRef: { current: null },

    // Dialog styling
    noteDetailDialogSxProps: {},
    setNoteDetailDialogSxProps: () => {},

    // Preview dialog state
    previewDialogProps: { open: false, loading: false },
    setPreviewDialogProps: () => {},
};

const NoteUIContext = createContext<NoteUIContextData>(noteUIContextDefaultValue);

export const useNoteUIStore = () => useContext(NoteUIContext);

export const NoteUIProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [selectedNote, setSelectedNoteState] = useState<Note | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const originalNoteRef = useRef<Note | null>(null);

    // Wrapped setSelectedNote with logging
    const setSelectedNote = React.useCallback((note: Note | null | ((prev: Note | null) => Note | null)) => {
        console.log('📌 NoteUIStore - setSelectedNote called:', note);
        if (typeof note === 'function') {
            setSelectedNoteState(prev => {
                const result = note(prev);
                console.log('📌 NoteUIStore - setSelectedNote (function):', { prev, result });
                return result;
            });
        } else {
            console.log('📌 NoteUIStore - setSelectedNote (direct):', note);
            setSelectedNoteState(note);
        }
    }, []);

    // Search UI state
    const [searchText, setSearchText] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Grid UI state
    const [loadingMasterGrid, setLoadingMasterGrid] = useState(false);
    const [refreshMasterGrid, setRefreshMasterGrid] = useState(false);
    const apiRef = useRef<any>(null);

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

    return (
        <NoteUIContext.Provider
            value={{
                // Dialog state
                selectedNote,
                setSelectedNote,
                isDialogOpen,
                setIsDialogOpen,
                hasUnsavedChanges,
                setHasUnsavedChanges,
                originalNoteRef,

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
            }}
        >
            {children}
        </NoteUIContext.Provider>
    );
}

