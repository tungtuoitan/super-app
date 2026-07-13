import { useAuthStore } from "@/shared";
import { dailyLogService } from "../service/dailyLog.service";
import type { DailyLogDTO, DailyLogFieldTemplateDTO } from "../service/dailyLog.service";
import { useDailyLogStore } from "../store/useDailyLog.store";
import { useDailyLogDetailStore } from "../store/useDailyLogDetail.store";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import type { DailyLog, DailyLogFieldTemplate, DailyLogHistoryPoint, DailyLogSection, DailyLogFieldType } from "../types/dailyLog.types";
import { formatIsoDate, stringifyValues, isSameLocalDay } from "../utils/dailyLog.utils";

function _hydrateLog(dto: DailyLogDTO): DailyLog {
    return {
        id: dto.id,
        userId: dto.userId,
        logDate: new Date(dto.logDate),
        valuesJson: dto.valuesJson ?? "{}",
        templateJson: dto.templateJson ?? null,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
    };
}

function _hydrateField(dto: DailyLogFieldTemplateDTO): DailyLogFieldTemplate {
    return {
        id: dto.id,
        userId: dto.userId,
        section: dto.section as DailyLogSection,
        fieldKey: dto.fieldKey,
        label: dto.label,
        fieldType: dto.fieldType as DailyLogFieldType,
        rangeMin: dto.rangeMin ?? null,
        rangeMax: dto.rangeMax ?? null,
        sortOrder: dto.sortOrder,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
    };
}

export const useDailyLogHelper = () => {
    const { $user } = useAuthStore();
    const { dateRange, setLogs, setIsLoading, setError } = useDailyLogStore();
    const { draftValues, setDraftValues, setIsDirty, setIsSaving } = useDailyLogDetailStore();

    const loadLogs = async () => {
        if (!$user.userId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await dailyLogService.getLogs($user.userToken, {
                from: formatIsoDate(dateRange.from),
                to: formatIsoDate(dateRange.to),
                deletedAt: "null",
            });
            if (res.success && res.data) {
                setLogs(res.data.map(_hydrateLog));
            } else {
                setLogs([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to load logs"));
        } finally {
            setIsLoading(false);
        }
    };

    const upsertLog = async (logDate: Date, templateSnapshotJson: string) => {
        if (!$user.userId) return null;
        setIsSaving(true);
        try {
            const res = await dailyLogService.upsertLog($user.userToken, {
                logDate: formatIsoDate(logDate),
                valuesJson: stringifyValues(draftValues),
                templateJson: templateSnapshotJson,
            });
            if (res.success && res.object) {
                const saved = _hydrateLog(res.object as DailyLogDTO);
                setLogs((prev) => {
                    const next = prev.filter((l) => !isSameLocalDay(l.logDate, saved.logDate));
                    next.push(saved);
                    next.sort((a, b) => b.logDate.getTime() - a.logDate.getTime());
                    return next;
                });
                setIsDirty(false);
                return saved;
            }
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const patchDraftValue = (path: string, value: string | number | boolean) => {
        setDraftValues((prev) => ({ ...prev, [path]: value }));
        setIsDirty(true);
    };

    const loadFieldHistory = async (fieldPath: string, from: Date, to: Date): Promise<DailyLogHistoryPoint[]> => {
        if (!$user.userId) return [];
        const res = await dailyLogService.getFieldHistory($user.userToken, fieldPath, formatIsoDate(from), formatIsoDate(to));
        if (!res.success || !res.data) return [];
        return res.data.map((p) => ({ logDate: new Date(p.logDate), value: p.value }));
    };

    return { loadLogs, upsertLog, patchDraftValue, loadFieldHistory };
};

export const useDailyLogTemplateHelper = () => {
    const { $user } = useAuthStore();
    const { setFields, setIsLoading } = useDailyLogTemplateStore();

    const loadTemplate = async () => {
        if (!$user.userId) return;
        setIsLoading(true);
        try {
            const res = await dailyLogService.getTemplate($user.userToken);
            if (res.success && res.data) {
                setFields(res.data.map(_hydrateField));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const upsertTemplate = async (
        fields: Array<{
            id?: number;
            section: DailyLogSection;
            fieldKey: string;
            label: string;
            fieldType: DailyLogFieldType;
            rangeMin?: number | null;
            rangeMax?: number | null;
            sortOrder: number;
            deletedAt?: string | null;
        }>
    ) => {
        if (!$user.userId) return;
        const res = await dailyLogService.upsertTemplate($user.userToken, fields);
        if (res.success && res.data) {
            setFields(res.data.map(_hydrateField).filter((f) => f.deletedAt == null));
        }
    };

    return { loadTemplate, upsertTemplate };
};
