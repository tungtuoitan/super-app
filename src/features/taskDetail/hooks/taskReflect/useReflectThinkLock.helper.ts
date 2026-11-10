/** Tells the Reflect sheet which rows can no longer change "I think"; the clock ticks so rows lock while the sheet stays open */

import { useEffect, useState } from "react";
import { nowMs } from "@/shared";
import { REFLECT_LOCK_CHECK_INTERVAL_MS } from "../../task.constants";
import type { ReflectRow } from "../../types/taskReflect.types";
import { isReflectThinkLocked } from "../../utils/taskReflect.utils";

export const useReflectThinkLockHelper = () => {
    const [currentMs, setCurrentMs] = useState(nowMs);

    useEffect(() => {
        const timer = setInterval(() => setCurrentMs(nowMs()), REFLECT_LOCK_CHECK_INTERVAL_MS);
        return () => clearInterval(timer);
    }, []);

    return { isThinkLocked: (row: ReflectRow) => isReflectThinkLocked(row, currentMs) };
};
