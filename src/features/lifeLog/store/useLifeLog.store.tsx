/**
 * LifeLog Store (Zustand)
 *
 * Migrated from React Context → Zustand. Public hook API unchanged.
 */

import React from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "@/shared";
import type { LifeLogTrack, LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";

export interface LifeLogContextData {
    tracks: LifeLogTrack[];
    setTracks: Dispatch<SetStateAction<LifeLogTrack[]>>;
    logs: LifeLogLog[];
    setLogs: Dispatch<SetStateAction<LifeLogLog[]>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;
    selectedTrackId: number | null;
    setSelectedTrackId: Dispatch<SetStateAction<number | null>>;
    selectedLogId: number | null;
    setSelectedLogId: Dispatch<SetStateAction<number | null>>;
}

const _store = create<LifeLogContextData>((set, get) => ({
    tracks: [],
    setTracks: zSetter("tracks", set, get),
    logs: [],
    setLogs: zSetter("logs", set, get),
    isLoading: false,
    setIsLoading: zSetter("isLoading", set, get),
    error: null,
    setError: zSetter("error", set, get),
    selectedTrackId: null,
    setSelectedTrackId: zSetter("selectedTrackId", set, get),
    selectedLogId: null,
    setSelectedLogId: zSetter("selectedLogId", set, get),
}));

export const useLifeLogStore = () => _store(useShallow((s) => s));
export const getLifeLogState = () => _store.getState();
export const subscribeLifeLogState = _store.subscribe;
