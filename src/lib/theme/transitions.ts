/**
 * Design System - Transition Tokens
 * Animation durations, easing functions, and common transitions
 */

export const transitions = {
    // Durations
    duration: {
        fastest: "100ms",
        fast: "200ms",
        normal: "300ms",
        slow: "400ms",
        slowest: "500ms",
    },

    // Timing functions
    easing: {
        easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
        easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
        easeIn: "cubic-bezier(0.4, 0, 1, 1)",
        sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },

    // Common transitions
    common: {
        short: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
        standard: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
        complex: "400ms cubic-bezier(0.4, 0, 0.2, 1)",
    },
} as const;

// Predefined transitions
export const commonTransitions = {
    fade: `opacity ${transitions.duration.normal} ${transitions.easing.easeInOut}`,
    slide: `transform ${transitions.duration.normal} ${transitions.easing.easeInOut}`,
    grow: `transform ${transitions.duration.normal} ${transitions.easing.easeInOut}`,
    all: `all ${transitions.duration.normal} ${transitions.easing.easeInOut}`,
} as const;
