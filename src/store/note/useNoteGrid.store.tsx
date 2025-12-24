/**
 * Note Grid Panel Store
 * Centralized state management for note grid panel
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import { Note } from '../../types/note.types';
import { RowSelectionState, SortingState, ColumnFiltersState } from '@tanstack/react-table';

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface NoteGridContextData {
    notes: Note[];
    setNotes: Dispatch<SetStateAction<Note[]>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    error: Error | null;
    setError: Dispatch<SetStateAction<Error | null>>;
    sorting: SortingState;
    setSorting: Dispatch<SetStateAction<SortingState>>;
    pagination: PaginationState;
    setPagination: Dispatch<SetStateAction<PaginationState>>;
    rowSelection: RowSelectionState;
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    columnFilters: ColumnFiltersState;
    setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    selectedNote: Note | null;
    setSelectedNote: Dispatch<SetStateAction<Note | null>>;
}

export const noteGridContextDefaultValue: NoteGridContextData = {
    notes: [],
    isLoading: true,
    error: null,
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 50 },
    rowSelection: {},
    columnFilters: [],
    selectedNote: null,
    setNotes: () => {},
    setIsLoading: () => {},
    setError: () => {},
    setSorting: () => {},
    setPagination: () => {},
    setRowSelection: () => {},
    setColumnFilters: () => {},
    setSelectedNote: () => {},
};

export const NoteGridStore = createContext<NoteGridContextData>(noteGridContextDefaultValue);

export const useNoteGridStore = () => useContext(NoteGridStore);

export const NoteGridProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);

    return (
        <NoteGridStore.Provider
            value={{
                notes,
                setNotes,
                isLoading,
                setIsLoading,
                error,
                setError,
                sorting,
                setSorting,
                pagination,
                setPagination,
                rowSelection,
                setRowSelection,
                columnFilters,
                setColumnFilters,
                selectedNote,
                setSelectedNote,
            }}
        >
            {children}
        </NoteGridStore.Provider>
    );
};
