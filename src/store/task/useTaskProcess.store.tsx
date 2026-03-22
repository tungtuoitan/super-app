/**
 * Task Process Store
 * UI state for the process section (expand/collapse, edit mode, etc.)
 * Mirrors TaskChecklistStore — same pattern, separate state.
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";

export interface TaskProcessContextData {
    isExpanded: boolean;
    setIsExpanded: Dispatch<SetStateAction<boolean>>;
    isProcessEditing: boolean;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    editText: string;
    setEditText: Dispatch<SetStateAction<string>>;
    editErrors: string[];
    setEditErrors: Dispatch<SetStateAction<string[]>>;
    editCursorPos: number;
    setEditCursorPos: Dispatch<SetStateAction<number>>;
    collapsedGroups: Set<string>;
    setCollapsedGroups: Dispatch<SetStateAction<Set<string>>>;
    barRef: RefObject<HTMLDivElement>;
    popupRef: RefObject<HTMLDivElement>;
}

export const taskProcessContextDefaultValue: TaskProcessContextData = {
    isExpanded: false,
    setIsExpanded: () => {},
    isProcessEditing: false,
    setIsEditing: () => {},
    editText: "",
    setEditText: () => {},
    editErrors: [],
    setEditErrors: () => {},
    editCursorPos: -1,
    setEditCursorPos: () => {},
    collapsedGroups: new Set(),
    setCollapsedGroups: () => {},
    barRef: { current: null },
    popupRef: { current: null },
};

export const TaskProcessStore = createContext<TaskProcessContextData>(taskProcessContextDefaultValue);

export const useTaskProcessStore = () => useContext(TaskProcessStore);

export const TaskProcessProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [editErrors, setEditErrors] = useState<string[]>([]);
    const [editCursorPos, setEditCursorPos] = useState(-1);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const barRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    return (
        <TaskProcessStore.Provider
            value={{
                isExpanded, setIsExpanded,
                isProcessEditing: isEditing, setIsEditing,
                editText, setEditText,
                editErrors, setEditErrors,
                editCursorPos, setEditCursorPos,
                collapsedGroups, setCollapsedGroups,
                barRef, popupRef,
            }}
        >
            {children}
        </TaskProcessStore.Provider>
    );
};
