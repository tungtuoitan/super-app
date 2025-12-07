/**
 * Notes API Service
 * Handles all note-related API operations including CRUD operations and data transformation
 */

import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '@/config/api.config';
import type { 
    Note, 
    GetNotesParams, 
    CreateNoteRequest, 
    UpdateNoteRequest, 
    NoteResponse,
    NoteCreateUpdateResponse 
} from '@/types/index';

/**
 * Transform API response to domain model
 * Converts NoteResponse with ISO date strings to Note with Date objects
 */
const transformNoteResponse = (noteResponse: NoteResponse): Note => ({
    id: noteResponse.id,  // Backend returns 'id' (mapped from NoteResponse.Id)
    name: noteResponse.name,
    description: noteResponse.description,
    tags: noteResponse.tags, // Backward compatibility
    hashtags: noteResponse.tags, // Primary field (backend still uses 'tags')
    type: noteResponse.type,
    createdBy: noteResponse.createdBy,
    createdAt: new Date(noteResponse.createdAt),
    updatedAt: noteResponse.updatedAt ? new Date(noteResponse.updatedAt) : undefined,
    isArchived: noteResponse.isArchived,
});

export const notesApi = {
    /**
     * Get notes from the API
     * @param params Optional parameters for filtering notes
     * @returns Promise resolving to array of Note objects with transformed dates
     */
    async getNotes(params: GetNotesParams = {}): Promise<Note[]> {
        const searchParams: Record<string, string | boolean> = {};

        if (params.getAll !== undefined) {
            searchParams.getAll = params.getAll;
        }
        if (params.searchText) {
            searchParams.searchText = params.searchText;
        }

        const data = await apiClient.get<NoteResponse[]>(
            API_ENDPOINTS.notes.getAll, 
            searchParams
        );

        return data.map(transformNoteResponse);
    },

    /**
     * Create a new note
     * @param request Note creation request data
     * @returns Promise resolving to created Note object
     */
    async createNote(request: CreateNoteRequest): Promise<Note> {
        const response = await apiClient.post<NoteResponse>(
            API_ENDPOINTS.notes.create,
            request
        );

        return transformNoteResponse(response);
    },

    /**
     * Update an existing note
     * @param id Note ID to update
     * @param request Note update request data
     * @returns Promise resolving to updated Note object
     */
    async updateNote(id: number, request: UpdateNoteRequest): Promise<Note> {
        const response = await apiClient.put<NoteResponse>(
            `${API_ENDPOINTS.notes.update}/${id}`,
            request
        );

        return transformNoteResponse(response);
    },

    /**
     * Delete a note
     * @param id Note ID to delete
     * @returns Promise resolving when deletion is complete
     */
    async deleteNote(id: number): Promise<void> {
        await apiClient.delete(`${API_ENDPOINTS.notes.delete}/${id}`);
    },
};
