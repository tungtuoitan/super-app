/**
 * Task Detail Section Store
 * UI state for the section tab bar (process / checklist / desc / comment / custom:xxx)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";

/** Built-in section tabs */
export type BuiltinTab = "process" | "checklist" | "desc" | "comment";

/** Section tab can be a built-in or a custom tab (prefixed with "custom:") */
export type SectionTab = BuiltinTab | `custom:${string}`;

/** Check if a tab is a custom tab */
export function isCustomTab(tab: SectionTab): tab is `custom:${string}` {
    return tab.startsWith("custom:");
}

/** Extract the custom tab ID from a SectionTab */
export function getCustomTabId(tab: SectionTab): string | null {
    return isCustomTab(tab) ? tab.slice(7) : null;
}

export interface TaskDetailSectionContextData {
    activeSection: SectionTab;
    setActiveSection: Dispatch<SetStateAction<SectionTab>>;
}

export const taskDetailSectionContextDefaultValue: TaskDetailSectionContextData = {
    activeSection: "process",
    setActiveSection: () => {},
};

export const TaskDetailSectionStore = createContext<TaskDetailSectionContextData>(
    taskDetailSectionContextDefaultValue,
);

export const useTaskDetailSectionStore = () => useContext(TaskDetailSectionStore);

export const TaskDetailSectionProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [activeSection, setActiveSection] = useState<SectionTab>("process");

    return (
        <TaskDetailSectionStore.Provider value={{ activeSection, setActiveSection }}>
            {children}
        </TaskDetailSectionStore.Provider>
    );
};
