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
    noteHasChanges: boolean;
    setSelectedNote: Dispatch<SetStateAction<Note | null>>;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
    setNoteHasChanges: Dispatch<SetStateAction<boolean>>;

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
    noteNameRef: React.RefObject<HTMLInputElement>;

    // Dialog styling
    noteDetailDialogSxProps: React.CSSProperties;
    setNoteDetailDialogSxProps: Dispatch<SetStateAction<React.CSSProperties>>;

    // Focus state
    shouldFocusNoteName: boolean;
    setShouldFocusNoteName: Dispatch<SetStateAction<boolean>>;

    // Preview dialog state
    previewDialogProps: DialogProps;
    setPreviewDialogProps: Dispatch<SetStateAction<DialogProps>>;
}

export const noteUIContextDefaultValue: NoteUIContextData = {
    // Dialog state
    selectedNote: null,
    isDialogOpen: false,
    noteHasChanges: false,
    setSelectedNote: () => {},
    setIsDialogOpen: () => {},
    setNoteHasChanges: () => {},
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
    noteNameRef: { current: null },

    // Dialog styling
    noteDetailDialogSxProps: {},
    setNoteDetailDialogSxProps: () => {},

    // Preview dialog state
    previewDialogProps: { open: false, loading: false },
    setPreviewDialogProps: () => {},

    // Focus state
    shouldFocusNoteName: false,
    setShouldFocusNoteName: () => {},
};

const NoteUIContext = createContext<NoteUIContextData>(noteUIContextDefaultValue);

export const useNoteUIStore = () => useContext(NoteUIContext);

export const NoteUIProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [selectedNote, setSelectedNoteState] = useState<Note | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [noteHasChanges, setNoteHasChanges] = useState(false);
    const originalNoteRef = useRef<Note | null>(null);

    // Wrapped setSelectedNote with logging
    const setSelectedNote = (note: Note | null | ((prev: Note | null) => Note | null)) => {
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
    }

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
    const noteNameRef = useRef<HTMLInputElement>(null);

    // Dialog styling
    const [noteDetailDialogSxProps, setNoteDetailDialogSxProps] = useState<React.CSSProperties>({});

    // Preview dialog state
    const [previewDialogProps, setPreviewDialogProps] = useState<DialogProps>({
        open: false,
        loading: false,
    });

    // Focus state
    const [shouldFocusNoteName, setShouldFocusNoteName] = useState(false);

    return (
        <NoteUIContext.Provider
            value={{
                // Dialog state
                selectedNote,
                setSelectedNote,
                isDialogOpen,
                setIsDialogOpen,
                noteHasChanges,
                setNoteHasChanges,
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
                noteNameRef,

                // Dialog styling
                noteDetailDialogSxProps,
                setNoteDetailDialogSxProps,

                // Preview dialog state
                previewDialogProps,
                setPreviewDialogProps,

                // Focus state
                shouldFocusNoteName,
                setShouldFocusNoteName,
            }}
        >
            {children}
        </NoteUIContext.Provider>
    );
}

