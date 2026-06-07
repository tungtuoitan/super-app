import { useEffect } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useAuthStore } from "@/shared";
import { config } from "config/app.config";
import { getKRepoSyncState } from "../store/kRepoSync.store";
import type { KSyncStatusMessage } from "../types/kRepoSync.type";

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

        connection.start().catch((err) =>
            console.warn("[KRepoSync] SignalR connection failed:", err)
        );

        return () => {
            connection.stop();
        };
    }, [$user.userToken]);
};
