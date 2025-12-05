/**
 * Note Grid Panel Store
 * Centralized state management for note grid panel
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import { Note } from '../../types/note.types';
import { SortingState } from '@tanstack/react-table';

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface NoteGridPanelContextData {
    notes: Note[];
    isLoading: boolean;
    error: Error | null;
    sorting: SortingState;
    pagination: PaginationState;
    setNotes: Dispatch<SetStateAction<Note[]>>;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    setError: Dispatch<SetStateAction<Error | null>>;
    setSorting: Dispatch<SetStateAction<SortingState>>;
    setPagination: Dispatch<SetStateAction<PaginationState>>;
}

export const noteGridPanelContextDefaultValue: NoteGridPanelContextData = {
    notes: [],
    isLoading: true,
    error: null,
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 50 },
    setNotes: () => {},
    setIsLoading: () => {},
    setError: () => {},
    setSorting: () => {},
    setPagination: () => {},
};

export const NoteGridPanelStore = createContext<NoteGridPanelContextData>(noteGridPanelContextDefaultValue);

export const useNoteGridPanelStore = () => useContext(NoteGridPanelStore);

export const NoteGridPanelProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    return (
        <NoteGridPanelStore.Provider
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
            }}
        >
            {children}
        </NoteGridPanelStore.Provider>
    );
};
