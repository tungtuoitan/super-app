/**
 * Task Grid Panel Store
 * Centralized state management for task grid panel
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import {LinkedKeyword} from "@/hooks/task/useTaskLinkedKeywords.helper";

export interface Task {
    id: number;
    projectId: number;
    parentTaskId?: number | null;
    type: string;
    title: string;
    note?: string | null;
    status: string;
    priority: string;
    startDate?: Date | null;
    endDate?: Date | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;

    // Workspace folder linked to this task (set when first note is created)
    folderWorkspaceItemId?: number | null;

    // Limit dates for warning display (parsed from backend)
    projectStartDate?: Date | null;
    projectEndDate?: Date | null;
    parentStartDate?: Date | null; // Only present if task is a subtask
    parentEndDate?: Date | null;
}

export interface TaskPaginationState {
    pageIndex: number;
    pageSize: number;
}

export interface TaskContextData {
    tasks: Task[];
    setTasks: Dispatch<SetStateAction<Task[]>>;
    taskTotalCount: number;
    setTaskTotalCount: Dispatch<SetStateAction<number>>;
    taskGridIsLoading: boolean;
    setTaskGridIsLoading: Dispatch<SetStateAction<boolean>>;
    taskGridError: Error | null;
    setTaskGridError: Dispatch<SetStateAction<Error | null>>;
    taskGridSorting: SortingState;
    setTaskGridSorting: Dispatch<SetStateAction<SortingState>>;
    taskGridPagination: TaskPaginationState;
    setTaskGridPagination: Dispatch<SetStateAction<TaskPaginationState>>;
    taskGridRowSelection: RowSelectionState;
    setTaskGridRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
    taskGridColumnFilters: ColumnFiltersState;
    setTaskGridColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
    taskContainerRef: RefObject<HTMLDivElement>;
    taskContainerWidth: number;
    setTaskContainerWidth: Dispatch<SetStateAction<number>>;
    linkedNotes: LinkedKeyword[];
     setLinkedNotes: Dispatch<SetStateAction<LinkedKeyword[]>>;
     isLoadingLinkedNotes: boolean;
     setIsLoadingLinkedNotes: Dispatch<SetStateAction<boolean>>;
}

export const taskContextDefaultValue: TaskContextData = {
    tasks: [],
    taskTotalCount: 0,
    taskGridIsLoading: true,
    taskGridError: null,
    taskGridSorting: [],
    taskGridPagination: { pageIndex: 0, pageSize: 50 },
    taskGridRowSelection: {},
    taskGridColumnFilters: [],
    taskContainerRef: { current: null },
    taskContainerWidth: 0,
    setTasks: () => {},
    setTaskTotalCount: () => {},
    setTaskGridIsLoading: () => {},
    setTaskGridError: () => {},
    setTaskGridSorting: () => {},
    setTaskGridPagination: () => {},
    setTaskGridRowSelection: () => {},
    setTaskGridColumnFilters: () => {},
    setTaskContainerWidth: () => {},
    linkedNotes: [],
    setLinkedNotes: () => {},
    isLoadingLinkedNotes: false,
    setIsLoadingLinkedNotes: () => {},
};

export const TaskStore = createContext<TaskContextData>(taskContextDefaultValue);

export const useTaskStore = () => useContext(TaskStore);

export const TaskProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskTotalCount, setTaskTotalCount] = useState<number>(0);
    const [taskGridIsLoading, setTaskGridIsLoading] = useState<boolean>(true);
    const [taskGridError, setTaskGridError] = useState<Error | null>(null);
    const [taskGridSorting, setTaskGridSorting] = useState<SortingState>([]);
    const [taskGridPagination, setTaskGridPagination] = useState<TaskPaginationState>({ pageIndex: 0, pageSize: 50 });
    const [taskGridRowSelection, setTaskGridRowSelection] = useState<RowSelectionState>({});
    const [taskGridColumnFilters, setTaskGridColumnFilters] = useState<ColumnFiltersState>([]);
    const taskContainerRef = useRef<HTMLDivElement>(null);
    const [taskContainerWidth, setTaskContainerWidth] = useState<number>(0);

    const [linkedNotes, setLinkedNotes] = useState<LinkedKeyword[]>([]);
    const [isLoadingLinkedNotes, setIsLoadingLinkedNotes] = useState(false);

    return (
        <TaskStore.Provider
            value={{
                tasks,
                setTasks,
                taskTotalCount,
                setTaskTotalCount,
                taskGridIsLoading,
                setTaskGridIsLoading,
                taskGridError,
                setTaskGridError,
                taskGridSorting,
                setTaskGridSorting,
                taskGridPagination,
                setTaskGridPagination,
                taskGridRowSelection,
                setTaskGridRowSelection,
                taskGridColumnFilters,
                setTaskGridColumnFilters,
                taskContainerRef,
                taskContainerWidth,
                setTaskContainerWidth,
                linkedNotes,
                setLinkedNotes,
                isLoadingLinkedNotes,
                setIsLoadingLinkedNotes,
            }}
        >
            {children}
        </TaskStore.Provider>
    );
};
