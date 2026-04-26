/**
 * MultiProject Task Store
 * State management for multi-project task views (list, kanban, timeline across multiple projects)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { RowSelectionState, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import type { Task, TaskPaginationState } from "@/features/taskDetail";

export type { TaskPaginationState } from "@/features/taskDetail";

export interface MpTaskContextData {
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
    taskSearchQuery: string;
    setTaskSearchQuery: Dispatch<SetStateAction<string>>;
}

export const mpTaskContextDefaultValue: MpTaskContextData = {
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
    taskSearchQuery: "",
    setTaskSearchQuery: () => {},
};

export const MpTaskStore = createContext<MpTaskContextData>(mpTaskContextDefaultValue);

export const useMpTaskStore = () => useContext(MpTaskStore);

export const MpTaskProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
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
    const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");

    return (
        <MpTaskStore.Provider
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
                taskSearchQuery, setTaskSearchQuery,
            }}
        >
            {children}
        </MpTaskStore.Provider>
    );
};
