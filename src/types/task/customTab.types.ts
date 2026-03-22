/**
 * Custom Tab types — user-created tabs with name, version, RichText content.
 * Stored as JSON string in Task.customTabsJson.
 */

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
