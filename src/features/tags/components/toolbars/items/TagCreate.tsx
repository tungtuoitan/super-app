import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useTagUI } from '../../../store/TagUIContext';
import { useAuthStore } from '@/contexts/AuthContext';
import type { Tag } from '../../../types/tag.types';

/**
 * Tag Create toolbar component
 * Creates a new tag dialog when clicked
 */
export const TagCreate = () => {
    const { openDialog } = useTagUI();
    const { auth } = useAuthStore();

    const handleCreateTag = () => {
        // Create a new tag object with id = 0 for create mode
        const newTag: Tag = {
            id: 0,
            tagId: 0, // Alias for backward compatibility
            userId: 1, // TODO: Get actual user ID from auth when available
            name: '',
            description: '',
            color: '#1976d2', // Default primary color
            parentId: undefined,
            level: 0,
            createdBy: 1, // TODO: Get actual user ID from auth when available
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            children: undefined,
            isExpanded: false,
        };
        
        openDialog(newTag);
    };

    return (
        <BottomNavigation onChange={() => {}}
            value={0}>
            <BottomNavigationAction
                label="Create Tag"
                onClick={handleCreateTag} />
        </BottomNavigation>
    );
};