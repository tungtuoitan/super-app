/**
 * Local storage service for type-safe browser storage operations.
 *
 * This service provides a consistent interface for localStorage operations
 * with proper error handling and type safety. It handles JSON serialization
 * and parsing automatically for complex objects.
 *
 * Features:
 * - Type-safe generic methods
 * - Automatic JSON serialization/deserialization
 * - Comprehensive error handling with logging
 * - Direct string methods for simple values
 * - Predefined storage keys for consistency
 */

export const storageService = {
    /**
     * Get an item from localStorage with automatic JSON parsing.
     *
     * @template T - The expected type of the stored value
     * @param key - The storage key to retrieve
     * @returns The parsed value or null if not found/invalid
     *
     * @example
     * ```typescript
     * interface User { id: number; name: string; }
     * const user = storageService.get<User>('currentUser');
     * ```
     */
    get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            return JSON.parse(item) as T;
        } catch (error) {
            console.error(`Error reading from localStorage: ${key}`, error);
            return null;
        }
    },

    /**
     * Set an item in localStorage with automatic JSON serialization.
     *
     * @template T - The type of the value to store
     * @param key - The storage key to use
     * @param value - The value to store
     *
     * @example
     * ```typescript
     * const user = { id: 1, name: 'John' };
     * storageService.set('currentUser', user);
     * ```
     */
    set<T>(key: string, value: T): void {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
        } catch (error) {
            console.error(`Error writing to localStorage: ${key}`, error);
        }
    },

    /**
     * Remove an item from localStorage.
     *
     * @param key - The storage key to remove
     */
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from localStorage: ${key}`, error);
        }
    },

    /**
     * Clear all items from localStorage.
     * Use with caution as this affects all stored data.
     */
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error("Error clearing localStorage", error);
        }
    },

    /**
     * Get a string value directly from localStorage without JSON parsing.
     * Useful for simple string values like tokens.
     *
     * @param key - The storage key to retrieve
     * @returns The string value or null if not found
     */
    getString(key: string): string | null {
        return localStorage.getItem(key);
    },

    /**
     * Set a string value directly in localStorage without JSON serialization.
     *
     * @param key - The storage key to use
     * @param value - The string value to store
     */
    setString(key: string, value: string): void {
        localStorage.setItem(key, value);
    },
};

// Storage keys constants
export const STORAGE_KEYS = {
    USER_PROFILE: "userProfile",
    MODULE_NAME: "moduleName",
    K_TREE_MARK: "k_tree_mark", // suffixed per workspace: k_tree_mark_{workspaceId}
} as const;
