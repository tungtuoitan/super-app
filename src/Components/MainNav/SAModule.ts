/**
 * Type definition for navigation module items.
 *
 * This type represents a single navigation module in the application's
 * sidebar navigation system. Each module corresponds to a functional
 * area or page within the application.
 */
export type SAModule = {
    /** Unique identifier for the module */
    id: string;
    /** Display name of the module */
    name: string;
    /** Code identifier used for icon mapping and internal references */
    code: string;
    /** Navigation link/route for the module */
    link: string;
    /** Whether the module should be hidden from display */
    hide: boolean;
    /** Whether the module opens in a new window/tab (nullable) */
    open: boolean | null | undefined;
    /** Whether the module is currently active/selected */
    active: boolean;
    /** Whether the module is in hover state */
    hover: boolean;
};
