import React from 'react';
import { 
    BottomNavigation, 
    BottomNavigationAction, 
    ToggleButton,
    ToggleButtonGroup,
    Box
} from '@mui/material';
import { 
    GridView as GridIcon,
    AccountTree as TreeIcon,
    ViewModule as CardIcon 
} from '@mui/icons-material';
import { useTagUI } from '../../../store/TagUIContext';
import type { TagLayoutType } from '../../../types/tag.types';

/**
 * Tag Layout Selector component
 * Provides 3 layout options: Grid, Tree, Card
 * Currently only Tree is implemented
 */
export const TagLayoutSelector = () => {
        const { currentLayout, setCurrentLayout } = useTagUI();

    const handleLayoutChange = (
        _event: React.MouseEvent<HTMLElement>,
        newLayout: TagLayoutType | null,
    ) => {
        if (newLayout !== null) {
            setCurrentLayout(newLayout);
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', margin: '2px 8px 0 0' }}>
            <ToggleButtonGroup
                value={currentLayout}
                exclusive
                onChange={handleLayoutChange}
                aria-label="tag layout"
                size="small"
            >
                <ToggleButton 
                    value="grid" 
                    aria-label="grid view"
                    disabled={true} // TODO: Enable when GridView is implemented
                    title="Grid View (Coming Soon)"
                >
                    <GridIcon fontSize="small" />
                </ToggleButton>
                
                <ToggleButton 
                    value="tree" 
                    aria-label="tree view"
                    title="Tree View"
                >
                    <TreeIcon fontSize="small" />
                </ToggleButton>
                
                <ToggleButton 
                    value="card" 
                    aria-label="card view"
                    disabled={true} // TODO: Enable when CardView is implemented
                    title="Card View (Coming Soon)"
                >
                    <CardIcon fontSize="small" />
                </ToggleButton>
            </ToggleButtonGroup>
        </Box>
    );
};