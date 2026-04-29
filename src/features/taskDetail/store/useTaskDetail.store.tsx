/**
 * Task Detail Store
 * State management for task detail editor (linked keywords, folder items, form options)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import type { LinkedKeyword, TaskFolderItem } from "../types/taskDetail.types";
import type { Project } from "../types/task.types";
import { IAutoCompleteOptions } from "@/shared";

export type { TaskFolderItem } from "../types/taskDetail.types";

export interface TaskDetailContextData {
    taskDetailContentRef: RefObject<HTMLDivElement>;

    // Linked Keywords
    linkedKeywords: LinkedKeyword[];
    setLinkedKeywords: Dispatch<SetStateAction<LinkedKeyword[]>>;
    isLoadingLinkedKeywords: boolean;
    setIsLoadingLinkedKeywords: Dispatch<SetStateAction<boolean>>;

    // Folder Items
    folderItems: TaskFolderItem[];
    setFolderItems: Dispatch<SetStateAction<TaskFolderItem[]>>;
    isLoadingFolderItems: boolean;
    setIsLoadingFolderItems: Dispatch<SetStateAction<boolean>>;

    // Project Options
    projectOptions: IAutoCompleteOptions[];
    setProjectOptions: Dispatch<SetStateAction<IAutoCompleteOptions[]>>;
    isLoadingProjects: boolean;
    setIsLoadingProjects: Dispatch<SetStateAction<boolean>>;

    // Parent Task Options
    parentTaskOptions: IAutoCompleteOptions[];
    setParentTaskOptions: Dispatch<SetStateAction<IAutoCompleteOptions[]>>;
    isLoadingParentTasks: boolean;
    setIsLoadingParentTasks: Dispatch<SetStateAction<boolean>>;

    allProjects: Project[];
    setAllProjects: Dispatch<SetStateAction<Project[]>>;
}

export const taskDetailContextDefaultValue: TaskDetailContextData = {
    taskDetailContentRef: { current: null },
    linkedKeywords: [],
    setLinkedKeywords: () => {},
    isLoadingLinkedKeywords: false,
    setIsLoadingLinkedKeywords: () => {},
    folderItems: [],
    setFolderItems: () => {},
    isLoadingFolderItems: false,
    setIsLoadingFolderItems: () => {},
    projectOptions: [],
    setProjectOptions: () => {},
    isLoadingProjects: false,
    setIsLoadingProjects: () => {},
    parentTaskOptions: [],
    setParentTaskOptions: () => {},
    isLoadingParentTasks: false, 
    setIsLoadingParentTasks: () => {},
    allProjects: [],
    setAllProjects: () => {}
};

export const TaskDetailStore = createContext<TaskDetailContextData>(taskDetailContextDefaultValue);

export const useTaskDetailStore = () => useContext(TaskDetailStore);

export const TaskDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const taskDetailContentRef = useRef<HTMLDivElement>(null);

    // Linked Keywords
    const [linkedKeywords, setLinkedKeywords] = useState<LinkedKeyword[]>([]);
    const [isLoadingLinkedKeywords, setIsLoadingLinkedKeywords] = useState(false);

    // Folder Items
    const [folderItems, setFolderItems] = useState<TaskFolderItem[]>([]);
    const [isLoadingFolderItems, setIsLoadingFolderItems] = useState(false);

    // Project Options
    const [projectOptions, setProjectOptions] = useState<IAutoCompleteOptions[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Parent Task Options
    const [parentTaskOptions, setParentTaskOptions] = useState<IAutoCompleteOptions[]>([]);
    const [isLoadingParentTasks, setIsLoadingParentTasks] = useState(false);

    const [allProjects, setAllProjects] = useState<Project[]>([]);

    return (
        <TaskDetailStore.Provider
            value={{
                taskDetailContentRef,
                linkedKeywords, setLinkedKeywords,
                isLoadingLinkedKeywords, setIsLoadingLinkedKeywords,
                folderItems, setFolderItems,
                isLoadingFolderItems, setIsLoadingFolderItems,
                projectOptions, setProjectOptions,
                isLoadingProjects, setIsLoadingProjects,
                parentTaskOptions, setParentTaskOptions,
                isLoadingParentTasks, setIsLoadingParentTasks,
                allProjects, setAllProjects
            }}
        >
            {children}
        </TaskDetailStore.Provider>
    );
};
