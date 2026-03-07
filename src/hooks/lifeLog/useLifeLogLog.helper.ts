/**
 * LifeLog Log Helper Hook
 * Business logic for log operations
 */

import { useCallback } from "react";
import { lifeLogService } from "@/services/lifeLog.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import type { LifeLogLog, LifeLogLogDTO, UpsertLifeLogLogDTO, LogType } from "@/types/lifeLog.types";
import { useSnackbar } from "notistack";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";

export function transformLog(dto: LifeLogLogDTO): LifeLogLog {
    const result = {
        id: dto.id,
        userId: dto.userId,
        type: (dto.type as LogType) ?? "note",
        trackId: dto.trackId ?? undefined,
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        isSensitive: dto.isSensitive ?? false,
        location: dto.location ?? undefined,
        occurAt: dto.occurAt ? parseAsLocalDate(dto.occurAt) ?? undefined : undefined,
        createdAt: parseAsLocalDate(dto.createdAt) ?? new Date(),
        updatedAt: dto.updatedAt ? parseAsLocalDate(dto.updatedAt) ?? undefined : undefined,
        deletedAt: dto.deletedAt ? parseAsLocalDate(dto.deletedAt) : null,
    };

    return result;
}

export function useLifeLogLogHelper() {
    const { setLogs, setIsLoading, setError, logs } = useLifeLogStore();
    const { $user } = useAuthStore();
    const token = $user.userToken;
    const { enqueueSnackbar } = useSnackbar();

    const loadLogs = useCallback(async (params?: {
        type?: string;
        trackId?: number;
        createdAtFrom?: string;
        createdAtTo?: string;
    }) => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await lifeLogService._getLogs(token, { ...params, deletedAt: "null" });
            if (result.success && result.data) {
                setLogs(result.data.map(transformLog));
            }
        } catch (err) {
            const msg = "Failed to load logs";
            setError(msg);
            console.error(msg, err);
        } finally {
            setIsLoading(false);
        }
    }, [token, setLogs, setIsLoading, setError]);

    const createLog = useCallback(async (data: UpsertLifeLogLogDTO): Promise<LifeLogLog | null> => {
        if (!token) return null;
        try {
            const result = await lifeLogService._upsertLogs(token, [data]);
            if (result.success && result.data?.[0]) {
                const saved = transformLog(result.data[0]);
                await loadLogs();
                return saved;
            }
            return null;
        } catch (err) {
            enqueueSnackbar("Failed to save log", { variant: "error" });
            console.error(err);
            return null;
        }
    }, [token, loadLogs, enqueueSnackbar]);

    const upsertLog = useCallback(async (data: UpsertLifeLogLogDTO): Promise<LifeLogLog | null> => {
        return createLog(data);
    }, [createLog]);

    const deleteLog = useCallback(async (logId: number): Promise<void> => {
        if (!token) return;
        const existing = logs.find((l) => l.id === logId);
        if (!existing) return;
        try {
            await lifeLogService._upsertLogs(token, [{
                id: existing.id,
                type: existing.type,
                trackId: existing.trackId,
                title: existing.title,
                description: existing.description,
                isSensitive: existing.isSensitive,
                location: existing.location,
                occurAt: existing.occurAt ? toLocalISOString(existing.occurAt) ?? undefined : undefined,
                deletedAt: toLocalISOString(new Date()) ?? undefined,
            }]);
            setLogs((prev) => prev.filter((l) => l.id !== logId));
        } catch (err) {
            enqueueSnackbar("Failed to delete log", { variant: "error" });
            console.error(err);
        }
    }, [token, logs, setLogs, enqueueSnackbar]);

    return { loadLogs, createLog, upsertLog, deleteLog };
}
