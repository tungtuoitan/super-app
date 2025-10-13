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
        <BottomNavigation onChange={() => {}}
            value={0}>
            <BottomNavigationAction
                label="Create Tag"
                onClick={handleCreateTag} />
        </BottomNavigation>
    );
};