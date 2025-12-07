/**
 * Note Utilities
 * Helper functions for note data transformation and manipulation
 */

import { Note } from '@/types/note.types';

/**
 * Transform note data to ensure dates are Date objects
 * Handles both API responses (string dates) and already-transformed notes
 * 
 * @param note - Note data from API or store
 * @returns Note with Date objects for createdAt/updatedAt
 */
export const transformNoteData = (note: Note): Note => {
    return {
        ...note,
        createdAt: note.createdAt instanceof Date 
            ? note.createdAt 
            : new Date(note.createdAt),
        updatedAt: note.updatedAt 
            ? (note.updatedAt instanceof Date 
                ? note.updatedAt 
                : new Date(note.updatedAt))
            : undefined,
    };
};

/**
 * Transform array of notes
 * 
 * @param notes - Array of notes from API
 * @returns Array of notes with transformed dates
 */
export const transformNotesData = (notes: Note[]): Note[] => {
    return notes.map(transformNoteData);
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
