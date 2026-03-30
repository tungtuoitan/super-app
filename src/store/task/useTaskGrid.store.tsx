/**
 * Task Grid Store
 * State management for task grid (list, kanban, timeline views)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import type { Task, TaskPaginationState } from "@/types/task/task.types";

export type { TaskPaginationState } from "@/types/task/task.types";

export interface TaskGridContextData {
    tasks: Task[];
    setTasks: Dispatch<SetStateAction<Task[]>>;
    /** All tasks (no status/priority filter) — used by TaskFlow to show full picture */
    allTasks: Task[];
    setAllTasks: Dispatch<SetStateAction<Task[]>>;
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
    taskDetailContentRef: RefObject<HTMLDivElement>;
}

export const taskGridContextDefaultValue: TaskGridContextData = {
    tasks: [],
    setTasks: () => {},
    allTasks: [],
    setAllTasks: () => {},
    taskTotalCount: 0,
    setTaskTotalCount: () => {},
    taskGridIsLoading: true,
    setTaskGridIsLoading: () => {},
    taskGridError: null,
    setTaskGridError: () => {},
    taskGridSorting: [],
    setTaskGridSorting: () => {},
    taskGridPagination: { pageIndex: 0, pageSize: 50 },
    setTaskGridPagination: () => {},
    taskGridRowSelection: {},
    setTaskGridRowSelection: () => {},
    taskGridColumnFilters: [],
    setTaskGridColumnFilters: () => {},
    taskContainerRef: { current: null },
    taskContainerWidth: 0,
    setTaskContainerWidth: () => {},
    taskDetailContentRef: { current: null },
};

export const TaskGridStore = createContext<TaskGridContextData>(taskGridContextDefaultValue);

export const useTaskGridStore = () => useContext(TaskGridStore);

export const TaskGridProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [taskTotalCount, setTaskTotalCount] = useState<number>(0);
    const [taskGridIsLoading, setTaskGridIsLoading] = useState<boolean>(true);
    const [taskGridError, setTaskGridError] = useState<Error | null>(null);
    const [taskGridSorting, setTaskGridSorting] = useState<SortingState>([]);
    const [taskGridPagination, setTaskGridPagination] = useState<TaskPaginationState>({ pageIndex: 0, pageSize: 50 });
    const [taskGridRowSelection, setTaskGridRowSelection] = useState<RowSelectionState>({});
    const [taskGridColumnFilters, setTaskGridColumnFilters] = useState<ColumnFiltersState>([]);
    const taskContainerRef = useRef<HTMLDivElement>(null);
    const [taskContainerWidth, setTaskContainerWidth] = useState<number>(0);
    const taskDetailContentRef = useRef<HTMLDivElement>(null);

    return (
        <TaskGridStore.Provider
            value={{
                tasks, setTasks,
                allTasks, setAllTasks,
                taskTotalCount, setTaskTotalCount,
                taskGridIsLoading, setTaskGridIsLoading,
                taskGridError, setTaskGridError,
                taskGridSorting, setTaskGridSorting,
                taskGridPagination, setTaskGridPagination,
                taskGridRowSelection, setTaskGridRowSelection,
                taskGridColumnFilters, setTaskGridColumnFilters,
                taskContainerRef,
                taskContainerWidth, setTaskContainerWidth,
                taskDetailContentRef,
            }}
        >
            {children}
        </TaskGridStore.Provider>
    );
};
