import { useEffect } from "react";
import { useAuthStore } from "@/shared";
import { useDailyLogStore } from "../store/useDailyLog.store";
import { useDailyLogDetailStore } from "../store/useDailyLogDetail.store";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import { useDailyLogHelper } from "./useDailyLog.helper";
import { isSameLocalDay, parseValues } from "../utils/dailyLog.utils";
import templateJson from "../dailyLog.template.json";
import type { DailyLogFieldTemplate } from "../types/dailyLog.types";

/** Initial fetch of logs whenever user or date range changes. Template is loaded from static JSON. */
export const useDailyLogHeadless = () => {
    const { $user } = useAuthStore();
    const { dateRange } = useDailyLogStore();
    const { loadLogs } = useDailyLogHelper();
    const { setFields } = useDailyLogTemplateStore();

    useEffect(() => {
        setFields(templateJson as unknown as DailyLogFieldTemplate[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!$user.userId) return;
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userId, $user.userToken, dateRange.from.getTime(), dateRange.to.getTime()]);
};

/** Sync draft editor values whenever the user picks a different date, or the log data changes for that date. */
export const useDailyLogDetailHeadless = () => {
    const { logs } = useDailyLogStore();
    const { selectedDate, setDraftValues, setIsDirty } = useDailyLogDetailStore();
    const { fields } = useDailyLogTemplateStore();

    useEffect(() => {
        if (!selectedDate) {
            setDraftValues({});
            setIsDirty(false);
            return;
        }
        const log = logs.find((l) => isSameLocalDay(l.logDate, selectedDate));
        setDraftValues(log ? parseValues(log.valuesJson) : {});
        setIsDirty(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate?.getTime(), logs, fields]);
};
