/**
 * LifeLog Context Store
 * Manages tracks and logs state
 */

import React, { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { LifeLogTrack, LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";

export interface LifeLogContextData {
    // Data
    tracks: LifeLogTrack[];
    setTracks: Dispatch<SetStateAction<LifeLogTrack[]>>;

    logs: LifeLogLog[];
    setLogs: Dispatch<SetStateAction<LifeLogLog[]>>;

    // Loading / Error
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;

    // Navigation selection
    selectedTrackId: number | null;
    setSelectedTrackId: Dispatch<SetStateAction<number | null>>;
    selectedLogId: number | null;
    setSelectedLogId: Dispatch<SetStateAction<number | null>>;
}

const LifeLogContext = createContext<LifeLogContextData | null>(null);

export function useLifeLogStore() {
    const ctx = useContext(LifeLogContext);
    if (!ctx) throw new Error("useLifeLogStore must be used within LifeLogProvider");
    return ctx;
}

export function LifeLogProvider({ children }: React.PropsWithChildren) {
    const [tracks, setTracks] = useState<LifeLogTrack[]>([]);
    const [logs, setLogs] = useState<LifeLogLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

    return (
        <LifeLogContext.Provider value={{
            tracks, setTracks,
            logs, setLogs,
            isLoading, setIsLoading,
            error, setError,
            selectedTrackId, setSelectedTrackId,
            selectedLogId, setSelectedLogId,
        }}>
            {children}
        </LifeLogContext.Provider>
    );
}
