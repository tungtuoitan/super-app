import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/Components/ui/tooltip";
import { SlidersHorizontal } from "lucide-react";

/**
 * Tag Filter toolbar component
 * Matches the exact UI pattern from NoteFilter
 */
export const TagFilter = () => {
    const filterCount = 0;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        {filterCount > 0 && (
                            <Badge 
                                variant="default"
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            >
                                {filterCount}
                            </Badge>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Filter</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};