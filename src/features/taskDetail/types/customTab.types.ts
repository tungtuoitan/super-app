/**
 * Custom Tab types — user-created tabs with name, version, RichText content.
 * Stored as JSON string in Task.customTabsJson.
 */

import type { ReflectRow } from "./taskReflect.types";

export interface CustomTab {
    id: string;
    name: string;
    version: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomTabsJSON {
    tabs: CustomTab[];
    /** Rows of the built-in Reflect tab; stored here so no backend change is needed */
    reflect?: ReflectRow[];
}

export interface CustomTabHandle {
    save: () => Promise<void>;
    discard: () => void;
}

export interface TaskCustomTabProps {
    tabId: string;
    focusTrigger?: number;
    onDirtyChange?: (dirty: boolean) => void;
}
