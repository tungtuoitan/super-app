/**
 * Task Detail Store
 * State management for task detail editor (linked keywords, folder items, form options)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import type { LinkedKeyword, TaskFolderItem } from "../types/taskDetail.types";
import { IAutoCompleteOptions } from "@/shared/components";

export type { TaskFolderItem } from "../types/taskDetail.types";

export interface TaskDetailContextData {
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
}

export const taskDetailContextDefaultValue: TaskDetailContextData = {
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
};

export const TaskDetailStore = createContext<TaskDetailContextData>(taskDetailContextDefaultValue);

export const useTaskDetailStore = () => useContext(TaskDetailStore);

export const TaskDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
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

    return (
        <TaskDetailStore.Provider
            value={{
                linkedKeywords, setLinkedKeywords,
                isLoadingLinkedKeywords, setIsLoadingLinkedKeywords,
                folderItems, setFolderItems,
                isLoadingFolderItems, setIsLoadingFolderItems,
                projectOptions, setProjectOptions,
                isLoadingProjects, setIsLoadingProjects,
                parentTaskOptions, setParentTaskOptions,
                isLoadingParentTasks, setIsLoadingParentTasks,
            }}
        >
            {children}
        </TaskDetailStore.Provider>
    );
};
