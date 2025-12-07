/**
 * Note Utilities
 * Helper functions for note data transformation and manipulation
 */

import { Note, NoteDTO } from '@/types/note.types';

/**
 * Transform NoteDTO from API to Note domain model
 * Converts string dates to Date objects and maps tags to hashtags
 * 
 * @param dto - Note DTO from API
 * @returns Note domain model
 */
export const transformNoteData = (dto: NoteDTO): Note => {
    return {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        hashtags: dto.tags || [], // Map 'tags' from backend to 'hashtags' in domain model
        tags: dto.tags, // Keep for backward compatibility
        type: dto.type,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : undefined,
        createdBy: dto.createdBy,
    };
};

/**
 * Transform array of NoteDTOs from API to Note domain models
 * 
 * @param dtos - Array of NoteDTOs from API
 * @returns Array of Note domain models with transformed dates
 */
export const transformNotesData = (dtos: NoteDTO[]): Note[] => {
    return dtos.map(transformNoteData);
};

/**
 * Format date for display
 * Handles both Date objects and ISO strings
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string or '-' if invalid
 */
export const formatNoteDate = (date: Date | string | undefined): string => {
    if (!date) return '-';
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(dateObj);
    } catch (error) {
        console.error('Error formatting date:', error, date);
        return '-';
    }
};
