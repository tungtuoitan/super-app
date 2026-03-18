/**
 * Task Checklist Store
 * UI state for the checklist component (expand/collapse, edit mode, etc.)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";

export interface TaskChecklistContextData {
    isExpanded: boolean;
    setIsExpanded: Dispatch<SetStateAction<boolean>>;
    isEditing: boolean;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    editText: string;
    setEditText: Dispatch<SetStateAction<string>>;
    editErrors: string[];
    setEditErrors: Dispatch<SetStateAction<string[]>>;
    collapsedGroups: Set<string>;
    setCollapsedGroups: Dispatch<SetStateAction<Set<string>>>;
    settingDefault: boolean;
    setSettingDefault: Dispatch<SetStateAction<boolean>>;
    barRef: RefObject<HTMLDivElement>;
    popupRef: RefObject<HTMLDivElement>;
}

export const taskChecklistContextDefaultValue: TaskChecklistContextData = {
    isExpanded: false,
    setIsExpanded: () => {},
    isEditing: false,
    setIsEditing: () => {},
    editText: "",
    setEditText: () => {},
    editErrors: [],
    setEditErrors: () => {},
    collapsedGroups: new Set(),
    setCollapsedGroups: () => {},
    settingDefault: false,
    setSettingDefault: () => {},
    barRef: { current: null },
    popupRef: { current: null },
};

export const TaskChecklistStore = createContext<TaskChecklistContextData>(taskChecklistContextDefaultValue);

export const useTaskChecklistStore = () => useContext(TaskChecklistStore);

export const TaskChecklistProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [editErrors, setEditErrors] = useState<string[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [settingDefault, setSettingDefault] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    return (
        <TaskChecklistStore.Provider
            value={{
                isExpanded, setIsExpanded,
                isEditing, setIsEditing,
                editText, setEditText,
                editErrors, setEditErrors,
                collapsedGroups, setCollapsedGroups,
                settingDefault, setSettingDefault,
                barRef, popupRef,
            }}
        >
            {children}
        </TaskChecklistStore.Provider>
    );
};
