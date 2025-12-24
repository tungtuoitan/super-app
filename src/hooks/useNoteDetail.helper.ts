import {useNoteDetailStore} from '@/store/note/useNoteDetail.store';
import {useNoteGridStore} from '@/store/note/useNoteGrid.store';
import { Note } from '@/types/note.types';

export const useNoteDetailHelper = () => {
    const {
        noteHasChanges,
        setNoteHasChanges,
        originalNoteRef,
    } = useNoteDetailStore();
    
    const { selectedNote, setSelectedNote } = useNoteGridStore();

    const updateSelectedNote = (updatedNote: Partial<Note>) => {

        if (!selectedNote) return;

        const updated = { ...selectedNote, ...updatedNote };

        // Check if this was originally a new note (originalRef has id === 0 or < 0)
        const wasNewNote = originalNoteRef.current?.id === 0 || (originalNoteRef.current?.id && originalNoteRef.current.id < 0);
        const isNowSaved = updated.id > 0;

        // If this was a new note and now has an ID, update the original reference
        if (wasNewNote && isNowSaved) {
            originalNoteRef.current = { ...updated };
            setNoteHasChanges(false);
            setSelectedNote(updated);
            return;
        }

        // For new notes that are still unsaved (id === 0 or < 0)
        if (updated.id === 0 || updated.id < 0) {
            const hasContent =
                updated.name?.trim() ||
                updated.description?.trim() ||
                (updated.tags && updated.tags.length > 0) ||
                updated.type;

            setNoteHasChanges(!!hasContent);
        } else {
            // For existing notes, compare with original
            if (originalNoteRef.current) {
                const fieldsToCheck: (keyof Note)[] = ['name', 'description', 'type', 'tags'];

                const hasChanges = fieldsToCheck.some((key) => {
                    const originalValue = originalNoteRef.current![key];
                    const updatedValue = updated[key];

                    // Deep comparison for arrays (tags)
                    if (Array.isArray(originalValue) && Array.isArray(updatedValue)) {
                        const originalTagIds = originalValue.map((t: any) => t.tagId || t.id).sort();
                        const updatedTagIds = updatedValue.map((t: any) => t.tagId || t.id).sort();
                        const isDifferent = JSON.stringify(originalTagIds) !== JSON.stringify(updatedTagIds);
                        return isDifferent;
                    }

                    // For other values, direct comparison
                    const isDifferent = originalValue !== updatedValue;
                    return isDifferent;
                });

                setNoteHasChanges(hasChanges);
            }
        }

        setSelectedNote(updated);
    };

    const markAsSaved = () => {
        if (selectedNote) {
            originalNoteRef.current = { ...selectedNote };
            setNoteHasChanges(false);
        }
    };

    const resetChanges = () => {
        if (originalNoteRef.current) {
            setSelectedNote({ ...originalNoteRef.current });
            setNoteHasChanges(false);
        }
    };

    return {
        selectedNote,
        noteHasChanges,
        updateSelectedNote,
        markAsSaved,
        resetChanges,
        setSelectedNote,
    };
};
