import { Plus } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {useNoteUI} from '../../../contexts/NoteUIContext';
import {Note} from '../../../types/note.types';

/**
 * Note Create toolbar component
 * Matches the exact UI pattern from ITRequestCreate
 */
export const NoteCreate = () => {
    const { openDialog } = useNoteUI();

    const handleCreateNote = () => {
        // Create a new note object with id = 0 for create mode
        const newNote: Note = {
            noteId: 0,
            name: '',
            description: '',
            tags: [],
            type: undefined,
            createdBy: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
        };
        
        openDialog(newNote);
    };

    return (
        <Button 
            variant="default"
            size="default"
            onClick={handleCreateNote}
            className="gap-2"
        >
            <Plus className="h-4 w-4" />
            Create Note
        </Button>
    );
};