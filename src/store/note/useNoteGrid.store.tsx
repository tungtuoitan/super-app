/**
 * Note Grid Panel Store
 * Centralized state management for note grid panel
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { Note } from "../../types/note.types";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface NoteGridContextData {
    notes: Note[];
    setNotes: Dispatch<SetStateAction<Note[]>>;
    noteGridIsLoading: boolean;
    setNoteGridIsLoading: Dispatch<SetStateAction<boolean>>;
    noteGridError: Error | null;
    setNoteGridError: Dispatch<SetStateAction<Error | null>>;
    noteGridSorting: SortingState;
    setNoteGridSorting: Dispatch<SetStateAction<SortingState>>;
    noteGridPagination: PaginationState;
    setNoteGridPagination: Dispatch<SetStateAction<PaginationState>>;
    noteGridRowSelection: RowSelectionState;
    setNoteGridRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    noteGridColumnFilters: ColumnFiltersState;
    setNoteGridColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    containerRef: RefObject<HTMLDivElement>;
    containerWidth: number;
    setContainerWidth: Dispatch<SetStateAction<number>>;
}

export const noteGridContextDefaultValue: NoteGridContextData = {
    notes: [],
    noteGridIsLoading: true,
    noteGridError: null,
    noteGridSorting: [],
    noteGridPagination: { pageIndex: 0, pageSize: 50 },
    noteGridRowSelection: {},
    noteGridColumnFilters: [],
    containerRef: { current: null },
    containerWidth: 0,
    setNotes: () => {},
    setNoteGridIsLoading: () => {},
    setNoteGridError: () => {},
    setNoteGridSorting: () => {},
    setNoteGridPagination: () => {},
    setNoteGridRowSelection: () => {},
    setNoteGridColumnFilters: () => {},
    setContainerWidth: () => {},
};

export const NoteGridStore = createContext<NoteGridContextData>(noteGridContextDefaultValue);

export const useNoteGridStore = () => useContext(NoteGridStore);

export const NoteGridProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [noteGridIsLoading, setNoteGridIsLoading] = useState<boolean>(true);
    const [noteGridError, setNoteGridError] = useState<Error | null>(null);
    const [noteGridSorting, setNoteGridSorting] = useState<SortingState>([]);
    const [noteGridPagination, setNoteGridPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [noteGridRowSelection, setNoteGridRowSelection] = useState<RowSelectionState>({});
    const [noteGridColumnFilters, setNoteGridColumnFilters] = useState<ColumnFiltersState>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    return (
        <NoteGridStore.Provider
            value={{
                notes,
                setNotes,
                noteGridIsLoading,
                setNoteGridIsLoading,
                noteGridError,
                setNoteGridError,
                noteGridSorting,
                setNoteGridSorting,
                noteGridPagination,
                setNoteGridPagination,
                noteGridRowSelection,
                setNoteGridRowSelection,
                noteGridColumnFilters,
                setNoteGridColumnFilters,
                containerRef,
                containerWidth,
                setContainerWidth,
            }}
        >
            {children}
        </NoteGridStore.Provider>
    );
};
