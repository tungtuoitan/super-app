/**
 * Notes Service Layer
 * Handles all note-related business logic and API communication
 */

import { apiClient } from '@/lib/api-client';

import type { Tag } from '@/types/folder.types';
import {CreateNoteDTO, GetNotesParams, Note, NoteDTO, NoteResponse, NotesResponse, UpdateNoteDTO} from '../types/note.types';

class NoteService {
    private readonly basePath = '/api/notes';

    /**
     * Transform Tag DTO from backend to frontend model
     * Backend only returns: tagId, name, description, color, createdAt, isActive, depth
     */
    private transformTag(tagDto: any): Tag {
        return {
            tagId: tagDto.tagId,
            name: tagDto.name,
            description: tagDto.description,
            color: tagDto.color,
            createdAt: tagDto.createdAt ? new Date(tagDto.createdAt) : new Date(),
            isActive: tagDto.isActive !== undefined ? tagDto.isActive : true,
            depth: tagDto.depth,
            // Computed/frontend-only properties
            id: tagDto.tagId, // Alias for backward compatibility
            isArchived: tagDto.isActive !== undefined ? !tagDto.isActive : false,
            children: [],
            isExpanded: false,
        };
    }

    /**
     * Transform NoteDTO to domain model
     */
    private transformNote(dto: NoteDTO): Note {
        return {
            ...dto,
            // Transform tags array with proper type conversion
            tags: dto.tags?.map(tag => this.transformTag(tag)) || [],
            createdAt: new Date(dto.createdAt),
            updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
        };
    }

    /**
     * Get all notes with optional filtering
     */
    async getNotes(params?: GetNotesParams): Promise<Note[]> {
        try {
            const searchParams: Record<string, string | number | boolean> = {};

            if (params?.getAll !== undefined) {
                searchParams.getAll = params.getAll;
            }
            if (params?.searchText) {
                searchParams.searchText = params.searchText;
            }
            if (params?.page !== undefined) {
                searchParams.page = params.page;
            }
            if (params?.pageSize !== undefined) {
                searchParams.pageSize = params.pageSize;
            }
            if (params?.type) {
                searchParams.type = params.type;
            }
            if (params?.isArchived !== undefined) {
                searchParams.isArchived = params.isArchived;
            }

            const response = await apiClient.get<NoteDTO[]>(this.basePath, {
                params: searchParams
            });

            // Handle different response structures
            let noteDTOs: NoteDTO[];
            if (Array.isArray(response)) {
                noteDTOs = response;
            } else if (response && typeof response === 'object' && 'data' in response) {
                noteDTOs = (response as NotesResponse).data;
            } else {
                noteDTOs = [];
            }

            return noteDTOs.map(this.transformNote);
        } catch (error) {
            console.error('Failed to fetch notes:', error);
            throw error;
        }
    }

    /**
     * Get single note by ID
     */
    async getNoteById(id: number): Promise<Note> {
        try {
            const response = await apiClient.get<NoteResponse>(`${this.basePath}/${id}`);
            
            const noteDTO = response.data || response;
            
            if (!noteDTO) {
                throw new Error('Note not found');
            }

            return this.transformNote(noteDTO as NoteDTO);
        } catch (error) {
            console.error(`Failed to fetch note ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create new note
     */
    async createNote(data: CreateNoteDTO): Promise<Note> {
        try {
            // Backend CreateNoteRequest has JsonPropertyName("tags") mapping to TagIds
            // So we send 'tags' in JSON, not 'tagIds'
            const requestPayload = {
                name: data.name,
                description: data.description,
                type: data.type,
                tags: data.tags, // Backend expects 'tags' in JSON (JsonPropertyName mapping)
            };

            console.log('Creating note - Request payload:', requestPayload);
            const response = await apiClient.post<NoteResponse>(this.basePath, requestPayload);
            
            const noteDTO = response.data || response;
            
            if (!noteDTO) {
                throw new Error('Failed to create note');
            }

            return this.transformNote(noteDTO as NoteDTO);
        } catch (error) {
            console.error('Failed to create note:', error);
            throw error;
        }
    }

    /**
     * Update existing note
     */
    async updateNote(id: number, data: UpdateNoteDTO): Promise<Note> {
        try {
            // Backend UpdateNoteRequest has JsonPropertyName("tags") mapping to TagIds
            // So we send 'tags' in JSON, not 'tagIds'
            const requestPayload = {
                noteId: id, // Backend expects noteId in the request body
                name: data.name,
                description: data.description,
                type: data.type,
                tags: data.tags, // Backend expects 'tags' in JSON (JsonPropertyName mapping)
                isArchived: data.isArchived,
            };

            console.log('Updating note - Request payload:', requestPayload);
            const response = await apiClient.put<NoteResponse>(`${this.basePath}/${id}`, requestPayload);
            
            const noteDTO = response.data || response;
            
            if (!noteDTO) {
                throw new Error('Failed to update note');
            }

            return this.transformNote(noteDTO as NoteDTO);
        } catch (error) {
            console.error(`Failed to update note ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete single or multiple notes
     */
    async deleteNote(id: number | string): Promise<void> {
        try {
            await apiClient.delete(`${this.basePath}/${id}`);
        } catch (error) {
            console.error(`Failed to delete note(s) ${id}:`, error);
            throw error;
        }
    }

    /**
     * Archive note (convenience method)
     */
    async archiveNote(id: number): Promise<Note> {
        return this.updateNote(id, { isArchived: true });
    }

    /**
     * Unarchive note (convenience method)
     */
    async unarchiveNote(id: number): Promise<Note> {
        return this.updateNote(id, { isArchived: false });
    }

    /**
     * Search notes
     */
    async searchNotes(searchText: string): Promise<Note[]> {
        return this.getNotes({ searchText });
    }

    /**
     * Delete multiple notes
     */
    async deleteNotes(ids: number[]): Promise<void> {
        try {
            // Convert array to comma-separated string
            const noteIds = ids.join(',');
            await apiClient.delete(`${this.basePath}/${noteIds}`);
        } catch (error) {
            console.error('Failed to delete notes:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const noteService = new NoteService();