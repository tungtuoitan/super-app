/**
 * Note Grid Store (Zustand)
 *
 * Migrated from React Context → Zustand. Public hook API unchanged.
 */

import React from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction, RefObject } from "react";
import { zSetter } from "@/shared";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { Note } from "../types/note.types";

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface NoteGridContextData {
    notes: Note[];
    setNotes: Dispatch<SetStateAction<Note[]>>;
    totalCount: number;
    setTotalCount: Dispatch<SetStateAction<number>>;
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

const _containerRef: RefObject<HTMLDivElement> = { current: null };

const _store = create<NoteGridContextData>((set, get) => ({
    notes: [],
    setNotes: zSetter("notes", set, get),
    totalCount: 0,
    setTotalCount: zSetter("totalCount", set, get),
    noteGridIsLoading: true,
    setNoteGridIsLoading: zSetter("noteGridIsLoading", set, get),
    noteGridError: null,
    setNoteGridError: zSetter("noteGridError", set, get),
    noteGridSorting: [],
    setNoteGridSorting: zSetter("noteGridSorting", set, get),
    noteGridPagination: { pageIndex: 0, pageSize: 50 },
    setNoteGridPagination: zSetter("noteGridPagination", set, get),
    noteGridRowSelection: {},
    setNoteGridRowSelection: zSetter("noteGridRowSelection", set, get),
    noteGridColumnFilters: [],
    setNoteGridColumnFilters: zSetter("noteGridColumnFilters", set, get),
    containerRef: _containerRef,
    containerWidth: 0,
    setContainerWidth: zSetter("containerWidth", set, get),
}));

export const useNoteGridStore = () => _store(useShallow((s) => s));
export const getNoteGridState = () => _store.getState();
export const subscribeNoteGridState = _store.subscribe;
