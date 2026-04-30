/**
 * LifeLog Log Helper Hook
 * Business logic for log operations
 */


import { lifeLogService } from "../service/lifeLog.service";
import { useAuthStore } from "@/shared";
import type { LifeLogLog, LifeLogLogDTO, UpsertLifeLogLogDTO, LogType } from "@/features/lifeLog/types/lifeLog.types";
import { useSnackbar } from "notistack";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { parseAsLocalDate, toLocalISOString } from "@/shared";
import { debugLog } from "@/shared";

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

    const loadLogs = async (params?: {
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
    }

    const createLog = async (data: UpsertLifeLogLogDTO): Promise<LifeLogLog | null> => {
        if (!token) {
            debugLog.log("lifelog", "createLog:noToken", {});
            return null;
        }
        debugLog.log("lifelog", "createLog:start", { id: data.id, type: data.type, trackId: data.trackId ?? null, title: data.title ?? null, isSensitive: data.isSensitive, occurAt: data.occurAt ?? null });
        try {
            const result = await lifeLogService._upsertLogs(token, [data]);
            if (result.success && result.data?.[0]) {
                const saved = transformLog(result.data[0]);
                debugLog.log("lifelog", "createLog:success", { savedId: saved.id, type: saved.type });
                await loadLogs();
                return saved;
            }
            debugLog.log("lifelog", "createLog:noData", { success: result.success, message: result.message });
            return null;
        } catch (err) {
            debugLog.log("lifelog", "createLog:catch", { error: String(err) });
            await debugLog.flush();
            enqueueSnackbar("Failed to save log", { variant: "error" });
            console.error(err);
            return null;
        }
    }

    const upsertLog = async (data: UpsertLifeLogLogDTO): Promise<LifeLogLog | null> => {
        return createLog(data);
    }
    const deleteLog = async (logId: number): Promise<void> => {
        if (!token) return;
        const existing = logs.find((l) => l.id === logId);
        if (!existing) {
            debugLog.log("lifelog", "deleteLog:notFound", { logId });
            return;
        }
        debugLog.log("lifelog", "deleteLog:start", { logId, type: existing.type, title: existing.title ?? null });
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
            debugLog.log("lifelog", "deleteLog:success", { logId });
        } catch (err) {
            debugLog.log("lifelog", "deleteLog:catch", { logId, error: String(err) });
            await debugLog.flush();
            enqueueSnackbar("Failed to delete log", { variant: "error" });
            console.error(err);
        }
    }

    return { loadLogs, createLog, upsertLog, deleteLog };
}
