/**
 * Debug Logger - Centralized logging for mobile debugging
 * Pattern: React Context store like AuthStore, not zustand
 */

import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

export interface LogEntry {
    timestamp: string;
    level: "log" | "warn" | "error" | "debug";
    component: string;
    message: string;
    data?: any;
}

export interface DebugLoggerStoreData {
    logs: LogEntry[];
    addLog: (component: string, message: string, data?: any, level?: "log" | "warn" | "error" | "debug") => void;
    clearLogs: () => void;
    isEnabled: boolean;
    setIsEnabled: Dispatch<SetStateAction<boolean>>;
}

const debugLoggerDefaultValue: DebugLoggerStoreData = {
    logs: [],
    addLog: () => {},
    clearLogs: () => {},
    isEnabled: true,
    setIsEnabled: () => {},
};

export const DebugLoggerContext = createContext<DebugLoggerStoreData>(debugLoggerDefaultValue);

export const useDebugLogger = () => {
    const ctx = useContext(DebugLoggerContext);
    if (!ctx) {
        throw new Error("useDebugLogger must be used within DebugLoggerProvider");
    }
    return ctx;
};

export const DebugLoggerProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isEnabled, setIsEnabled] = useState<boolean>(true); // Enable by default for mobile debugging

    const addLog = (
        component: string,
        message: string,
        data?: any,
        level: "log" | "warn" | "error" | "debug" = "log"
    ) => {
        const newLog: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            component,
            message,
            data,
        };

        // Keep only last 100 logs to avoid memory issues
        setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 100));

    };

    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <DebugLoggerContext.Provider
            value={{
                logs,
                addLog,
                clearLogs,
                isEnabled,
                setIsEnabled,
            }}
        >
            {children}
        </DebugLoggerContext.Provider>
    );
};

/**
 * Helper hook to create scoped logger
 */
export function useLogger(componentName: string) {
    const { addLog } = useDebugLogger();

    return {
        log: (message: string, data?: any) => addLog(componentName, message, data, "log"),
        warn: (message: string, data?: any) => addLog(componentName, message, data, "warn"),
        error: (message: string, data?: any) => addLog(componentName, message, data, "error"),
        debug: (message: string, data?: any) => addLog(componentName, message, data, "debug"),
    };
}
