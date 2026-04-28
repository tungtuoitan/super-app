/**
 * Common Utility Types
 * Reusable type definitions for props, components, and shared interfaces
 */

import type { CSSProperties, ReactNode } from "react";

/**
 * Component Props
 */

/**
 * Base properties common to most components
 * Provides standard styling and structure props
 */
export interface BaseComponentProps {
    children?: ReactNode;
    style?: CSSProperties;
    className?: string;
}

/**
 * Props for dialog/modal components
 * Extends base props with dialog-specific functionality
 */
export interface DialogProps extends BaseComponentProps {
    open: boolean;
    onClose: () => void;
    title?: string | ReactNode;
}

/**
 * Props for toolbar components
 * Used in grid headers and action bars
 */
export interface ToolbarProps {
    children: ReactNode;
    className?: string;
}

/**
 * Props for grid container components
 * Wrapper for data display grids with ref support
 */
export interface GridContainerProps extends BaseComponentProps {
    ref?: React.Ref<HTMLDivElement>;
}
