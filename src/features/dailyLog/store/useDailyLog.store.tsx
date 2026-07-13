import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { DailyLog } from "../types/dailyLog.types";

export interface DailyLogDateRange {
    from: Date;
    to: Date;
}

export interface DailyLogContextData {
    logs: DailyLog[];
    setLogs: Dispatch<SetStateAction<DailyLog[]>>;
    dateRange: DailyLogDateRange;
    setDateRange: Dispatch<SetStateAction<DailyLogDateRange>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    error: Error | null;
    setError: Dispatch<SetStateAction<Error | null>>;
}

function defaultDateRange(): DailyLogDateRange {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    from.setDate(to.getDate() - 29);
    return { from, to };
}

const defaultValue: DailyLogContextData = {
    logs: [],
    dateRange: defaultDateRange(),
    isLoading: false,
    error: null,
    setLogs: () => {},
    setDateRange: () => {},
    setIsLoading: () => {},
    setError: () => {},
};

export const DailyLogStore = createContext<DailyLogContextData>(defaultValue);

export const useDailyLogStore = () => useContext(DailyLogStore);

export const DailyLogProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [dateRange, setDateRange] = useState<DailyLogDateRange>(defaultDateRange());
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    return (
        <DailyLogStore.Provider value={{ logs, setLogs, dateRange, setDateRange, isLoading, setIsLoading, error, setError }}>
            {children}
        </DailyLogStore.Provider>
    );
};
