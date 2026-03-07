/**
 * LifeLog Track Helper Hook
 * Business logic for track operations
 */

import { useCallback } from "react";
import { lifeLogService } from "@/services/lifeLog.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import type { LifeLogTrack, LifeLogTrackDTO, UpsertLifeLogTrackDTO } from "@/types/lifeLog.types";
import { useSnackbar } from "notistack";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { toLocalISOString } from "@/utils/date.utils";

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
        if (!token) return null;
        try {
            const result = await lifeLogService._upsertTracks(token, [data]);
            if (result.success && result.data?.[0]) {
                const saved = transformTrack(result.data[0]);
                await loadTracks();
                return saved;
            }
            return null;
        } catch (err) {
            enqueueSnackbar("Failed to save track", { variant: "error" });
            console.error(err);
            return null;
        }
    }, [token, loadTracks, enqueueSnackbar]);

    const deleteTrack = useCallback(async (id: number) => {
        if (!token) return;
        const existing = tracks.find((t) => t.id === id);
        if (!existing) return;
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
            await loadTracks();
        } catch (err) {
            enqueueSnackbar("Failed to delete track", { variant: "error" });
            console.error(err);
        }
    }, [token, tracks, loadTracks, enqueueSnackbar]);

    return { loadTracks, upsertTrack, deleteTrack };
}
