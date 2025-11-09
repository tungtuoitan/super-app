import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';

/**
 * Note Filter toolbar component
 * Matches the exact UI pattern from ITRequestFilter
 */
export const NoteFilter = () => {
    const filterCount = 0;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative inline-flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <SlidersHorizontal className="h-5 w-5" />
                        </Button>
                        {filterCount > 0 && (
                            <Badge 
                                variant="default" 
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            >
                                {filterCount}
                            </Badge>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Filter</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};