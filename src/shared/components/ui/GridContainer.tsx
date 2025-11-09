import { CSSProperties, LegacyRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props interface for the GridContainer component.
 */
export interface GridContainerProps {
    /** Child components to render within the grid container */
    children: ReactNode;
    /** Optional CSS class name for custom styling */
    className?: string;
    /** Optional inline styles for the container */
    style?: CSSProperties;
    /** Optional ref for direct DOM access */
    ref?: LegacyRef<HTMLDivElement>;
    /** Optional identifier for the container */
    id?: string;
    /** Whether to disable the default background color */
    noBackground?: boolean;
    /** Whether to disable default padding/margins */
    noPadding?: boolean;
}

/**
 * GridContainer - A layout container component for data grids and tables.
 *
 * This component provides a standardized container for grid layouts with:
 * - Consistent background and spacing
 * - Proper overflow handling for large datasets
 * - Flexible content area that adapts to available space
 * - Support for custom styling and theming
 *
 * The container uses a two-layer structure:
 * 1. Root - Provides the main layout structure
 * 2. Wrapper - Provides the content area with margins
 *
 * @param props - Grid container configuration props
 * @returns Styled container component for grid layouts
 */
export function GridContainer({
    children,
    className,
    style,
    ref,
    id,
    noBackground = false,
    noPadding = false,
    ...props
}: GridContainerProps) {
    return (
        <div
            ref={ref}
            id={id}
            className={cn(
                'w-full h-full flex flex-col overflow-x-auto overflow-y-hidden',
                !noBackground && 'bg-[rgb(246,246,246)]',
                className
            )}
            style={style}
            {...props}
        >
            <div
                className={cn(
                    'flex-1 overflow-auto',
                    !noPadding && 'm-1.5'
                )}
            >
                {children}
            </div>
        </div>
    );
}
