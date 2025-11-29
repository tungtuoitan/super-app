import {useNoteUIStore} from '@/store/note/useNoteUIStore';
import { Note } from '@/types/note.types';

export const useNoteUIHelper = () => {
    const {
        selectedNote,
        setSelectedNote,
        isDialogOpen,
        setIsDialogOpen,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        originalNoteRef,
    } = useNoteUIStore();

    const openDialog = (note: Note) => {
        console.log('🚪 openDialog called:', note);

        // Initialize originalNoteRef when a note is selected
        if (!originalNoteRef.current || originalNoteRef.current.noteId !== note.noteId) {
            console.log('📌 Initializing originalNoteRef:', note);
            originalNoteRef.current = { ...note };
        }

        setSelectedNote(note);

        // For new notes, set hasUnsavedChanges based on existing content
        const isNewNote = note.noteId === 0;
        if (isNewNote) {
            const hasContent =
                note.name?.trim() ||
                note.description?.trim() ||
                (note.tags && note.tags.length > 0) ||
                note.type;
            setHasUnsavedChanges(!!hasContent);
        } else {
            setHasUnsavedChanges(false);
        }

        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            setSelectedNote(null);
            originalNoteRef.current = null;
            setHasUnsavedChanges(false);
        }, 200); // After animation
    };

    const updateSelectedNote = (updatedNote: Partial<Note>) => {
        console.log('🔄 updateSelectedNote called with:', updatedNote);

        if (!selectedNote) return;

        const updated = { ...selectedNote, ...updatedNote };

        console.log('📝 Previous state:', selectedNote);
        console.log('✨ Updated state:', updated);
        console.log('📌 Original ref:', originalNoteRef.current);

        // Check if this was originally a new note (originalRef has noteId === 0)
        const wasNewNote = originalNoteRef.current?.noteId === 0;
        const isNowSaved = updated.noteId > 0;

        // If this was a new note and now has an ID, update the original reference
        if (wasNewNote && isNowSaved) {
            originalNoteRef.current = { ...updated };
            setHasUnsavedChanges(false);
            setSelectedNote(updated);
            return;
        }

        // For new notes that are still unsaved (noteId === 0)
        if (updated.noteId === 0) {
            const hasContent =
                updated.name?.trim() ||
                updated.description?.trim() ||
                (updated.tags && updated.tags.length > 0) ||
                updated.type;

            console.log('📄 New note content check:', {
                name: updated.name,
                description: updated.description,
                tags: updated.tags,
                type: updated.type,
                hasContent,
            });

            setHasUnsavedChanges(!!hasContent);
        } else {
            // For existing notes, compare with original
            if (originalNoteRef.current) {
                const fieldsToCheck: (keyof Note)[] = ['name', 'description', 'type', 'tags', 'isArchived'];

                const hasChanges = fieldsToCheck.some((key) => {
                    const originalValue = originalNoteRef.current![key];
                    const updatedValue = updated[key];

                    // Deep comparison for arrays (tags)
                    if (Array.isArray(originalValue) && Array.isArray(updatedValue)) {
                        const originalTagIds = originalValue.map((t: any) => t.tagId || t.id).sort();
                        const updatedTagIds = updatedValue.map((t: any) => t.tagId || t.id).sort();
                        const isDifferent = JSON.stringify(originalTagIds) !== JSON.stringify(updatedTagIds);
                        console.log(`  🏷️  ${key} comparison:`, { originalTagIds, updatedTagIds, isDifferent });
                        return isDifferent;
                    }

                    // For other values, direct comparison
                    const isDifferent = originalValue !== updatedValue;
                    console.log(`  📊 ${key} comparison:`, { originalValue, updatedValue, isDifferent });
                    return isDifferent;
                });

                console.log('✅ Existing note change check result:', {
                    hasChanges,
                    checkedFields: fieldsToCheck,
                });

                setHasUnsavedChanges(hasChanges);
            }
        }

        setSelectedNote(updated);
    };

    const markAsSaved = () => {
        if (selectedNote) {
            originalNoteRef.current = { ...selectedNote };
            setHasUnsavedChanges(false);
        }
    };

    const resetChanges = () => {
        if (originalNoteRef.current) {
            setSelectedNote({ ...originalNoteRef.current });
            setHasUnsavedChanges(false);
        }
    };

    return {
        selectedNote,
        isDialogOpen,
        hasUnsavedChanges,
        openDialog,
        closeDialog,
        updateSelectedNote,
        markAsSaved,
        resetChanges,
        setSelectedNote,
    };
};
