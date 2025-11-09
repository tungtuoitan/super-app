import { Plus } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { useTagUI } from '../../../store/TagUIContext';
import { useAuthStore } from '@/contexts/AuthContext';
import type { Tag } from '../../../types/tag.types';

/**
 * Tag Add toolbar component
 * Opens add tag dialog when clicked
 */
export const TagAdd = () => {
    const { openDialog } = useTagUI();
    const { auth } = useAuthStore();

    const handleAddTag = () => {
        // Create a new tag object with tagId = 0 for create mode
        const newTag: Tag = {
            tagId: 0,
            name: '',
            description: '',
            color: '#1976d2', // Default primary color
            createdAt: new Date(),
            isActive: true,
            depth: 0,
            children: [],
            isExpanded: false,
            isArchived: false,
        };
        
        openDialog(newTag);
    };

    return (
        <Button
            variant="default"
            size="sm"
            onClick={handleAddTag}
            className="gap-2"
        >
            <Plus className="h-4 w-4" />
            Add Tag
        </Button>
    );
};