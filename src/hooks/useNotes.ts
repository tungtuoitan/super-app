/**
 * Notes React Query Hooks
 * Custom hooks for notes data fetching using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {CreateNoteDTO, GetNotesParams, UpdateNoteDTO} from '../types/note.types';
import {noteService} from '../services/noteService';

// Query Keys
export const noteKeys = {
    all: ['notes'] as const,
    lists: () => [...noteKeys.all, 'list'] as const,
    list: (params?: GetNotesParams) => [...noteKeys.lists(), params] as const,
    details: () => [...noteKeys.all, 'detail'] as const,
    detail: (id: number) => [...noteKeys.details(), id] as const,
};

/**
 * Hook to fetch notes list
 */
export function useNotes(params?: GetNotesParams) {
    console.log('useNotes called with params')
    return useQuery({
        queryKey: noteKeys.list(params),
        queryFn: () => noteService.getNotes(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to fetch single note by ID
 */
export function useNote(id: number, enabled = true) {
    return useQuery({
        queryKey: noteKeys.detail(id),
        queryFn: () => noteService.getNoteById(id),
        enabled: enabled && !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to create a note
 */
export function useCreateNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateNoteDTO) => noteService.createNote(data),
        onSuccess: () => {
            // Invalidate all note queries to refetch
            queryClient.invalidateQueries({ queryKey: noteKeys.all });
        },
    });
}

/**
 * Hook to update a note
 */
export function useUpdateNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateNoteDTO }) =>
            noteService.updateNote(id, data),
        onSuccess: (updatedNote, { id }) => {
            // Update the specific note in cache
            queryClient.setQueryData(noteKeys.detail(id), updatedNote);
            
            // Invalidate all note lists to refetch (including the main grid)
            queryClient.invalidateQueries({ queryKey: noteKeys.all });
        },
    });
}

/**
 * Hook to delete a note
 */
export function useDeleteNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => noteService.deleteNote(id),
        onSuccess: (_, id) => {
            // Remove note from cache
            queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
            
            // Invalidate all note queries to refetch
            queryClient.invalidateQueries({ queryKey: noteKeys.all });
        },
    });
}

/**
 * Hook to archive a note
 */
export function useArchiveNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => noteService.archiveNote(id),
        onSuccess: (updatedNote, id) => {
            // Update the specific note in cache
            queryClient.setQueryData(noteKeys.detail(id), updatedNote);
            
            // Invalidate all note queries to refetch
            queryClient.invalidateQueries({ queryKey: noteKeys.all });
        },
    });
}

/**
 * Hook to unarchive a note
 */
export function useUnarchiveNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => noteService.unarchiveNote(id),
        onSuccess: (updatedNote, id) => {
            // Update the specific note in cache
            queryClient.setQueryData(noteKeys.detail(id), updatedNote);
            
            // Invalidate all note queries to refetch
            queryClient.invalidateQueries({ queryKey: noteKeys.all });
        },
    });
}

/**
 * Hook to search notes
 */
export function useSearchNotes(searchText: string, enabled = true) {
    return useQuery({
        queryKey: ['notes', 'search', searchText],
        queryFn: () => noteService.searchNotes(searchText),
        enabled: enabled && !!searchText && searchText.length > 2,
        staleTime: 1 * 60 * 1000, // 1 minute for search results
    });
}

/**
 * Hook to delete multiple notes
 */
export function useDeleteNotes() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (ids: number[]) => noteService.deleteNotes(ids),
        onSuccess: () => {
            // Invalidate all note queries to refetch
            queryClient.invalidateQueries({ queryKey: noteKeys.all });
        },
    });
}