/**
 * Task Checklist Store
 * UI state for the checklist component (expand/collapse, edit mode, env tabs, etc.)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import type { ChecklistType } from "../types/checklist.types";
import type { TestcaseEnvironment } from "../types/checklist.constants";
import { DEFAULT_ENV } from "../types/checklist.constants";

export interface TaskChecklistContextData {
    isExpanded: boolean;
    setIsExpanded: Dispatch<SetStateAction<boolean>>;
    isChecklistEditing: boolean;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    editText: string;
    setEditText: Dispatch<SetStateAction<string>>;
    editErrors: string[];
    setEditErrors: Dispatch<SetStateAction<string[]>>;
    editCursorPos: number;
    setEditCursorPos: Dispatch<SetStateAction<number>>;
    editChecklistType: ChecklistType;
    setEditChecklistType: Dispatch<SetStateAction<ChecklistType>>;
    collapsedGroups: Set<string>;
    setCollapsedGroups: Dispatch<SetStateAction<Set<string>>>;
    settingDefault: boolean;
    setSettingDefault: Dispatch<SetStateAction<boolean>>;
    barRef: RefObject<HTMLDivElement>;
    popupRef: RefObject<HTMLDivElement>;
    /** Active testcase environment tab */
    activeEnv: TestcaseEnvironment;
    setActiveEnv: Dispatch<SetStateAction<TestcaseEnvironment>>;
    /** Optional environments toggled on by user (UAT, PROD) */
    enabledOptionalEnvs: TestcaseEnvironment[];
    setEnabledOptionalEnvs: Dispatch<SetStateAction<TestcaseEnvironment[]>>;
}

export const taskChecklistContextDefaultValue: TaskChecklistContextData = {
    isExpanded: false,
    setIsExpanded: () => {},
    isChecklistEditing: false,
    setIsEditing: () => {},
    editText: "",
    setEditText: () => {},
    editErrors: [],
    setEditErrors: () => {},
    editCursorPos: -1,
    setEditCursorPos: () => {},
    editChecklistType: "checklist",
    setEditChecklistType: () => {},
    collapsedGroups: new Set(),
    setCollapsedGroups: () => {},
    settingDefault: false,
    setSettingDefault: () => {},
    barRef: { current: null },
    popupRef: { current: null },
    activeEnv: DEFAULT_ENV,
    setActiveEnv: () => {},
    enabledOptionalEnvs: [],
    setEnabledOptionalEnvs: () => {},
};

export const TaskChecklistStore = createContext<TaskChecklistContextData>(taskChecklistContextDefaultValue);

export const useTaskChecklistStore = () => useContext(TaskChecklistStore);

export const TaskChecklistProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [editErrors, setEditErrors] = useState<string[]>([]);
    const [editCursorPos, setEditCursorPos] = useState(-1);
    const [editChecklistType, setEditChecklistType] = useState<ChecklistType>("checklist");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [settingDefault, setSettingDefault] = useState(false);
    const [activeEnv, setActiveEnv] = useState<TestcaseEnvironment>(DEFAULT_ENV);
    const [enabledOptionalEnvs, setEnabledOptionalEnvs] = useState<TestcaseEnvironment[]>([]);
    const barRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    return (
        <TaskChecklistStore.Provider
            value={{
                isExpanded, setIsExpanded,
                isChecklistEditing: isEditing, setIsEditing,
                editText, setEditText,
                editErrors, setEditErrors,
                editCursorPos, setEditCursorPos,
                editChecklistType, setEditChecklistType,
                collapsedGroups, setCollapsedGroups,
                settingDefault, setSettingDefault,
                barRef, popupRef,
                activeEnv, setActiveEnv,
                enabledOptionalEnvs, setEnabledOptionalEnvs,
            }}
        >
            {children}
        </TaskChecklistStore.Provider>
    );
};
