// shared/hooks/useKeyboardShortcut.ts
import { useEffect } from "react";

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcutConfig {
    /** The key to listen for (e.g., 'Enter', 'Escape', 's') */
    key: string;
    /** Require Ctrl/Cmd key */
    ctrl?: boolean;
    /** Require Shift key */
    shift?: boolean;
    /** Require Alt key */
    alt?: boolean;
    /** Whether the shortcut is enabled */
    enabled?: boolean;
    /** Callback to execute when shortcut is triggered */
    callback: () => void;
    /** Description for documentation/help */
    description?: string;
}

/**
 * Hook to register keyboard shortcuts
 *
 * @example
 * ```tsx
 * // Simple Enter key
 * useKeyboardShortcut({
 *   key: 'Enter',
 *   callback: handleSubmit,
 *   enabled: isDialogOpen,
 * })
 *
 * // Ctrl+S to save
 * useKeyboardShortcut({
 *   key: 's',
 *   ctrl: true,
 *   callback: handleSave,
 * })
 * ```
 */
export function useKeyboardShortcut({ key, ctrl = false, shift = false, alt = false, enabled = true, callback }: KeyboardShortcutConfig) {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Check if shortcut is enabled
        if (!enabled) return;

        // Check modifiers
        const ctrlOrCmd = ctrl ? e.ctrlKey || e.metaKey : true;
        const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
        const altMatch = alt ? e.altKey : !e.altKey;

        const modifiersMatch = ctrlOrCmd && shiftMatch && altMatch;

        // Check key match (case insensitive)
        const keyMatch = e.key.toLowerCase() === key.toLowerCase();

        if (keyMatch && modifiersMatch) {
            e.preventDefault();
            e.stopPropagation();
            callback();
        }
    };

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enabled]);
}

/**
 * Hook for input-specific shortcuts (Enter, Escape in forms)
 */
export function useInputShortcuts({ onEnter, onEscape, enabled = true }: { onEnter?: () => void; onEscape?: () => void; enabled?: boolean }) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!enabled) return;

        if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
        }

        if (e.key === "Escape" && onEscape) {
            e.preventDefault();
            onEscape();
        }
    };

    return { onKeyDown: handleKeyDown };
}

/**
 * Common keyboard shortcuts
 */
export const SHORTCUTS = {
    SAVE: { key: "s", ctrl: true, description: "Save" },
    CLOSE: { key: "Escape", description: "Close dialog" },
    SUBMIT: { key: "Enter", description: "Submit form" },
    DELETE: { key: "Delete", description: "Delete item" },
    SEARCH: { key: "k", ctrl: true, description: "Search" },
    NEW: { key: "n", ctrl: true, description: "Create new" },
} as const;
