import React, { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface AutoCompleteOptionProps extends React.HTMLAttributes<HTMLLIElement> {
    /** Child content to display in the option */
    children: React.ReactNode;
    /** Whether the option is disabled */
    disabled?: boolean;
    /** Optional inline styles */
    style?: CSSProperties;
}

/**
 * Reusable option component for autocomplete items
 *
 * @example
 * ```tsx
 * <AutoCompleteOption {...props}>
 *   Option Label
 * </AutoCompleteOption>
 * ```
 */
export function AutoCompleteOption({
    children,
    disabled,
    className,
    style,
    ...props
}: AutoCompleteOptionProps) {
    return (
        <li
            {...props}
            className={cn(
                disabled && 'opacity-50 pointer-events-none',
                className
            )}
            style={style}
        >
            {children}
        </li>
    );
}

export default AutoCompleteOption;
