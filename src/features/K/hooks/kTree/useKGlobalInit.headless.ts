import { useEffect } from "react";
import { useAuthStore } from "@/shared";
import { useKLoader } from "./useK.loader";
import { useKRepoSyncRealtime } from "../useKRepoSyncRealtime.headless";
import { KRepoSyncService } from "../../service/kRepoSync.service";
import { getKRepoSyncState } from "../../store/kRepoSync.store";

export const useKGlobalInit = () => {
    const { $user } = useAuthStore();
    const { loadAllK } = useKLoader();

    useEffect(() => {
        if (!$user.userId) return;
        loadAllK();
    }, [$user.userId, $user.userToken]);

    // Real-time sync status via SignalR
    useKRepoSyncRealtime();

    // 10-min polling fallback — updates store if SignalR is disconnected
    // useEffect(() => {
    //     if (!$user.userToken) return;

    //     const poll = async () => {
    //         try {
    //             const status = await KRepoSyncService._getStatus($user.userToken);
    //             const { setSyncStatus, setStatusMessage, setRepoUrl, setLastPushAt } = getKRepoSyncState();
    //             setSyncStatus(status.statusCode);
    //             setStatusMessage(status.statusMessage ?? null);
    //             setRepoUrl(status.repoUrl ?? "");
    //             setLastPushAt(status.lastPushAt ?? null);
    //         } catch {
    //             // ignore — SignalR is the primary channel
    //         }
    //     };

    //     poll(); // immediate on mount
    //     const id = setInterval(poll, 10 * 60 * 1000);
    //     return () => clearInterval(id);
    // }, [$user.userToken]);
};
