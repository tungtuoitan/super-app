/**
 * Schedules Reflect row saves: a row is written shortly after its last edit, and rows still waiting
 * are flushed when the journal closes.
 */

import { useEffect, useRef } from "react";
import { reflectConstants } from "../reflect.constants";
import { useReflectSaveRowHelper } from "./useReflectSaveRow.helper";

export const useReflectSaverHelper = () => {
    const { saveRow } = useReflectSaveRowHelper();
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const scheduleSave = (rowId: string) => {
        const old = timers.current.get(rowId);
        if (old) clearTimeout(old);
        timers.current.set(
            rowId,
            setTimeout(() => {
                timers.current.delete(rowId);
                void saveRow(rowId);
            }, reflectConstants.saveDelayMs),
        );
    };

    useEffect(() => {
        const pending = timers.current;
        return () => {
            pending.forEach((timer, rowId) => {
                clearTimeout(timer);
                void saveRow(rowId);
            });
            pending.clear();
        };
    }, [saveRow]);

    return { scheduleSave };
};
