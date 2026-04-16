/**
 * LifeLog Track Helper Hook
 * Business logic for track operations
 */

import { useCallback } from "react";
import { lifeLogService } from "../service/lifeLog.service";
import { useAuthStore } from "@/store/Auth.store";
import type { LifeLogTrack, LifeLogTrackDTO, UpsertLifeLogTrackDTO } from "@/features/lifeLog/types/lifeLog.types";
import { useSnackbar } from "notistack";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { toLocalISOString } from "@/utils/date.utils";
import { debugLog } from "@/shell/hooks/useDebugLog";

function transformTrack(dto: LifeLogTrackDTO): LifeLogTrack {
    return {
        id: dto.id,
        userId: dto.userId,
        name: dto.name,
        emoji: dto.emoji,
        description: dto.description,
        isSensitive: dto.isSensitive ?? false,
        color: dto.color,
        createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null, 
    };
}

export function useLifeLogTrackHelper() {
    const { setTracks, setIsLoading, setError, tracks } = useLifeLogStore();
    const { $user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const token = $user.userToken;

    const loadTracks = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await lifeLogService._getTracks(token, { deletedAt: "null" });
            if (result.success && result.data) {
                setTracks(result.data.map(transformTrack));
            }
        } catch (err) {
            const msg = "Failed to load tracks";
            setError(msg);
            console.error(msg, err);
        } finally {
            setIsLoading(false);
        }
    }, [token, setTracks, setIsLoading, setError]);

    const upsertTrack = useCallback(async (data: UpsertLifeLogTrackDTO): Promise<LifeLogTrack | null> => {
        if (!token) {
            debugLog.log("lifelog", "upsertTrack:noToken", {});
            return null;
        }
        debugLog.log("lifelog", "upsertTrack:start", { id: data.id, name: data.name, emoji: data.emoji ?? null, color: data.color ?? null, isSensitive: data.isSensitive });
        try {
            const result = await lifeLogService._upsertTracks(token, [data]);
            if (result.success && result.data?.[0]) {
                const saved = transformTrack(result.data[0]);
                debugLog.log("lifelog", "upsertTrack:success", { savedId: saved.id, name: saved.name });
                await loadTracks();
                return saved;
            }
            debugLog.log("lifelog", "upsertTrack:noData", { success: result.success, message: result.message });
            return null;
        } catch (err) {
            debugLog.log("lifelog", "upsertTrack:catch", { error: String(err) });
            await debugLog.flush();
            enqueueSnackbar("Failed to save track", { variant: "error" });
            console.error(err);
            return null;
        }
    }, [token, loadTracks, enqueueSnackbar]);

    const deleteTrack = useCallback(async (id: number) => {
        if (!token) return;
        const existing = tracks.find((t) => t.id === id);
        if (!existing) {
            debugLog.log("lifelog", "deleteTrack:notFound", { id });
            return;
        }
        debugLog.log("lifelog", "deleteTrack:start", { id, name: existing.name });
        try {
            await lifeLogService._upsertTracks(token, [{
                id: existing.id,
                name: existing.name,
                emoji: existing.emoji,
                description: existing.description,
                isSensitive: existing.isSensitive,
                color: existing.color,
                deletedAt: toLocalISOString(new Date()) ?? undefined,
            }]);
            debugLog.log("lifelog", "deleteTrack:success", { id });
            await loadTracks();
        } catch (err) {
            debugLog.log("lifelog", "deleteTrack:catch", { id, error: String(err) });
            await debugLog.flush();
            enqueueSnackbar("Failed to delete track", { variant: "error" });
            console.error(err);
        }
    }, [token, tracks, loadTracks, enqueueSnackbar]);

    return { loadTracks, upsertTrack, deleteTrack };
}
