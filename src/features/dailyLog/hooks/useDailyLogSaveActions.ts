import { useCallback } from "react";
import { useDailyLogDetailStore } from "../store/useDailyLogDetail.store";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import { useDailyLogHelper } from "./useDailyLog.helper";
import { isSameLocalDay, startOfLocalDay } from "../utils/dailyLog.utils";

/**
 * Save action registered with the shell — invoked by Ctrl+S / global save button.
 * Persists the current draft for the selected date. Only today is editable.
 */
export const useDailyLogSaveActions = () => {
    const { selectedDate, isDirty } = useDailyLogDetailStore();
    const { fields } = useDailyLogTemplateStore();
    const { upsertLog } = useDailyLogHelper();

    const onSave = useCallback(async () => {
        if (!selectedDate || !isDirty) return;
        if (!isSameLocalDay(selectedDate, startOfLocalDay(new Date()))) return;
        const activeFields = fields.filter((f) => f.deletedAt == null);
        const snapshot = JSON.stringify(activeFields);
        await upsertLog(selectedDate, snapshot);
    }, [selectedDate, isDirty, fields, upsertLog]);

    return { onSave };
};
