import React from 'react';
import { Button } from '@/Components/ui/button';
import { 
    Grid3x3 as GridIcon,
    Network as TreeIcon,
    LayoutGrid as CardIcon 
} from 'lucide-react';
import { useTagUI } from '../../../store/TagUIContext';
import type { TagLayoutType } from '../../../types/tag.types';
import { cn } from '@/lib/utils';

/**
 * Tag Layout Selector component
 * Provides 3 layout options: Grid, Tree, Card
 * Currently only Tree is implemented
 */
export const TagLayoutSelector = () => {
    const { currentLayout, setCurrentLayout } = useTagUI();

    const handleLayoutChange = (newLayout: TagLayoutType) => {
        setCurrentLayout(newLayout);
    };

    return (
        <div className="flex items-center gap-1 mr-2 mt-0.5">
            <Button
                variant={currentLayout === 'grid' ? 'default' : 'ghost'}
                size="sm"
                disabled={true} // TODO: Enable when GridView is implemented
                title="Grid View (Coming Soon)"
                aria-label="grid view"
                onClick={() => handleLayoutChange('grid')}
                className={cn(
                    "h-8 w-8 p-0",
                    currentLayout === 'grid' && "bg-primary text-primary-foreground"
                )}
            >
                <GridIcon className="h-4 w-4" />
            </Button>
            
            <Button
                variant={currentLayout === 'tree' ? 'default' : 'ghost'}
                size="sm"
                title="Tree View"
                aria-label="tree view"
                onClick={() => handleLayoutChange('tree')}
                className={cn(
                    "h-8 w-8 p-0",
                    currentLayout === 'tree' && "bg-primary text-primary-foreground"
                )}
            >
                <TreeIcon className="h-4 w-4" />
            </Button>
            
            <Button
                variant={currentLayout === 'card' ? 'default' : 'ghost'}
                size="sm"
                disabled={true} // TODO: Enable when CardView is implemented
                title="Card View (Coming Soon)"
                aria-label="card view"
                onClick={() => handleLayoutChange('card')}
                className={cn(
                    "h-8 w-8 p-0",
                    currentLayout === 'card' && "bg-primary text-primary-foreground"
                )}
            >
                <CardIcon className="h-4 w-4" />
            </Button>
        </div>
    );
};