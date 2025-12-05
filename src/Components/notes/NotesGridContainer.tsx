import { ToolbarContainer } from '@/shared/components/ToolbarContainer';
import { LegacyRef, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface INotesGridContainer {
    toolbar?: React.ReactNode;
    toolbarItems?: React.ReactNode;
    grid: React.ReactNode;
    className?: string;
    style?: CSSProperties;
    ref?: LegacyRef<HTMLDivElement>;
    gridWrapperClassName?: string;
    toolbarClassName?: string;
}

/**
 * Notes Grid Container component matching portal's GridContainer pattern
 * Provides a consistent layout for notes with toolbar and grid sections
 */
export const NotesGridContainer = ({ 
    toolbar, 
    toolbarItems, 
    grid, 
    className, 
    style, 
    ref, 
    gridWrapperClassName,
    toolbarClassName 
}: INotesGridContainer) => {
    return (
        <div 
            ref={ref}
            className={cn("w-full overflow-x-auto overflow-y-hidden bg-[#f6f6f6]", className)}
            style={style}
        >
            {toolbar != null && 
                <div className={cn("flex flex-col [&_.paper-root]:bg-white [&_.paper-root]:text-black", toolbarClassName)}>
                    {toolbar}
                </div>
            }
            {toolbarItems != null && 
                <ToolbarContainer>
                    {toolbarItems}
                </ToolbarContainer>
            }
            <div className={cn("mx-5 mt-5", gridWrapperClassName)}>
                {grid}
            </div>
        </div>
    );
};