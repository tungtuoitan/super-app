import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "@/shared";
import type { KSyncStatus, KRepoSyncDiff } from "../types/kRepoSync.type";

export interface KRepoSyncContextData {
    syncStatus: KSyncStatus;
    setSyncStatus: Dispatch<SetStateAction<KSyncStatus>>;
    statusMessage: string | null;
    setStatusMessage: Dispatch<SetStateAction<string | null>>;
    syncDirection: "push" | "pull" | null;
    setSyncDirection: Dispatch<SetStateAction<"push" | "pull" | null>>;
    repoUrl: string;
    setRepoUrl: Dispatch<SetStateAction<string>>;
    lastPushAt: string | null;
    setLastPushAt: Dispatch<SetStateAction<string | null>>;
    diff: KRepoSyncDiff | null;
    setDiff: Dispatch<SetStateAction<KRepoSyncDiff | null>>;
    isDiffModalOpen: boolean;
    setIsDiffModalOpen: Dispatch<SetStateAction<boolean>>;
}

const _store = create<KRepoSyncContextData>((set, get) => ({
    syncStatus: "idle",
    setSyncStatus: zSetter("syncStatus", set, get),
    statusMessage: null,
    setStatusMessage: zSetter("statusMessage", set, get),
    syncDirection: null,
    setSyncDirection: zSetter("syncDirection", set, get),
    repoUrl: "",
    setRepoUrl: zSetter("repoUrl", set, get),
    lastPushAt: null,
    setLastPushAt: zSetter("lastPushAt", set, get),
    diff: null,
    setDiff: zSetter("diff", set, get),
    isDiffModalOpen: false,
    setIsDiffModalOpen: zSetter("isDiffModalOpen", set, get),
}));

export const useKRepoSyncStore  = () => _store(useShallow((s) => s));
export const getKRepoSyncState  = () => _store.getState();
export const subscribeKRepoSyncState = _store.subscribe;
