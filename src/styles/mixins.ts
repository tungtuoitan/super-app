/**
 * Style mixins and utility functions for consistent styling.
 *
 * This module provides reusable style objects and functions that can be
 * applied throughout the application for consistent design patterns.
 * All mixins return React.CSSProperties types for type safety.
 */

import { CSSProperties } from "react";

/**
 * Truncate single-line text with ellipsis overflow.
 *
 * @returns CSS object for single-line text truncation
 *
 * @example
 * ```typescript
 * <div style={truncateText()}>
 *   This is a very long text that will be truncated...
 * </div>
 * ```
 */
export function truncateText(): CSSProperties {
    return {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    };
}

/**
 * Truncate multi-line text with ellipsis overflow.
 *
 * @param lines - Number of lines to show before truncation (default: 2)
 * @returns CSS object for multi-line text truncation
 *
 * @example
 * ```typescript
 * <div style={truncateMultiline(3)}>
 *   This is a longer text that will be truncated after 3 lines...
 * </div>
 * ```
 */
export function truncateMultiline(lines: number = 2): CSSProperties {
    return {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
    };
}

/**
 * Apply smooth CSS transition to properties.
 *
 * @param property - CSS property to transition (default: 'all')
 * @param duration - Transition duration (default: '0.3s')
 * @returns CSS object for smooth transitions
 *
 * @example
 * ```typescript
 * <div style={{
 *   ...smoothTransition('opacity', '0.5s'),
 * }}>
 *   Hover me for smooth fade
 * </div>
 * ```
 */
export function smoothTransition(property: string = "all", duration: string = "0.3s"): CSSProperties {
    return {
        transition: `${property} ${duration} ease`,
    };
}

/**
 * Hide scrollbars while maintaining scroll functionality.
 *
 * Works across all major browsers (Chrome, Safari, Firefox, IE/Edge).
 *
 * @returns CSS object to hide scrollbars
 *
 * @example
 * ```typescript
 * <div className="overflow-auto" style={hideScrollbar()}>
 *   Scrollable content without visible scrollbars
 * </div>
 * ```
 */
export function hideScrollbar(): CSSProperties {
    return {
        scrollbarWidth: "none" as const, // Firefox
        msOverflowStyle: "none" as const, // IE and Edge
    };
}

/**
 * Center an absolutely positioned element.
 *
 * Uses transform to center the element both horizontally and vertically
 * relative to its positioned parent.
 *
 * @returns CSS object for absolute centering
 *
 * @example
 * ```typescript
 * <div className="relative">
 *   <div style={absoluteCenter()}>
 *     Perfectly centered content
 *   </div>
 * </div>
 * ```
 */
export function absoluteCenter(): CSSProperties {
    return {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
    };
}
