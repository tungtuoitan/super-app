import type { SectionTab } from "@/features/taskDetail/store/useTaskDetailSection.store";

/** Check if a tab is a custom tab (prefix "custom:") */
export function isCustomTab(tab: SectionTab): tab is `custom:${string}` {
    return tab.startsWith("custom:");
}

/** Extract the custom tab ID from a SectionTab, or null if not a custom tab */
export function getCustomTabId(tab: SectionTab): string | null {
    return isCustomTab(tab) ? tab.slice(7) : null;
}
