import { useEffect } from "react";
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr";
import { useAuthStore } from "@/shared";
import { config } from "config/app.config";
import { getKRepoSyncState } from "../store/kRepoSync.store";
import type { KSyncStatusMessage } from "../types/kRepoSync.type";

// Module-level so non-React callers (e.g. notifyViewing) can reach the active hub
// connection without prop-drilling. Set to null between mount/unmount cycles.
let _activeConnection: HubConnection | null = null;

export const useKRepoSyncRealtime = () => {
    const { $user } = useAuthStore();

    useEffect(() => {
        if (!$user.userToken) return;

        const { setSyncStatus, setStatusMessage, setSyncDirection } = getKRepoSyncState();

        const connection = new HubConnectionBuilder()
            .withUrl(`${config.api.baseURL}/hubs/k-sync`, {
                accessTokenFactory: () => $user.userToken,
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        connection.on("UpdateSyncStatus", (msg: KSyncStatusMessage) => {
            setSyncStatus(msg.status);
            setStatusMessage(msg.message ?? null);
            setSyncDirection(msg.direction === "push" || msg.direction === "pull" ? msg.direction : null);
        });

        connection.start()
            .then(() => { _activeConnection = connection; })
            .catch((err) => console.warn("[KRepoSync] SignalR connection failed:", err));

        return () => {
            _activeConnection = null;
            connection.stop();
        };
    }, [$user.userToken]);
};

/**
 * Invoke a hub method only if the connection is currently open. Used by the
 * Review Changes popup to tell the BE it's actively being viewed (so the
 * daemon doesn't push DB → remote and invalidate the entries on screen).
 *
 * Errors are swallowed: the popup must work even if SignalR is down — the
 * daemon will just push as usual, which is the existing behaviour.
 */
export const notifyViewing = async (action: "start" | "stop") => {
    const conn = _activeConnection;
    if (!conn || conn.state !== HubConnectionState.Connected) return;
    try {
        await conn.invoke(action === "start" ? "StartViewing" : "StopViewing");
    } catch (err) {
        console.warn(`[KRepoSync] ${action}Viewing failed:`, err);
    }
};
