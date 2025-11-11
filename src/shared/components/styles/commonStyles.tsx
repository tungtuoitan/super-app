/**
 * Common styled components for consistent UI patterns
 */

/**
 * Grow component for flexible spacing in toolbars
 * Creates a flexible spacer that grows to fill available space
 */
export const Grow = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`flex-grow p-0 m-0 ${className}`} {...props} />
);


/**
 * Group icon container for toolbar icon groups
 */
export const GroupIconContainer = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={`flex flex-row justify-between items-center [&_button]:ml-0 [&_button]:p-3 [&_svg]:text-black ${className}`}
        {...props}
    >
        {children}
    </div>
);

/**
 * Styled AppBar component with consistent theme
 */
export const StyledAppBar = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <header
        className={`bg-white text-black ${className}`}
        {...props}
    >
        {children}
    </header>
);
