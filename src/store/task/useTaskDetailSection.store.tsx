/**
 * Task Detail Section Store
 * UI state for the section tab bar (process / checklist / desc / comment / custom:xxx)
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState } from "react";

/** Built-in section tabs */
export type BuiltinTab = "process" | "checklist" | "desc" | "comment";

/** Section tab can be a built-in or a custom tab (prefixed with "custom:") */
export type SectionTab = BuiltinTab | `custom:${string}`;

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
