/**
 * Task Timeline Store
 * Context-based store for timeline view state.
 * Shared across selector, helper, headless, and UI via context.
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { storageService } from "@/shared/services/storage.service";

// Constants
export const STORAGE_KEY_ZOOM = "timeline_day_width";
export const DEFAULT_DAY_WIDTH = 40;
export const MIN_DAY_WIDTH = 20;
export const MAX_DAY_WIDTH = 80;

export interface TaskTimelineContextData {
    timelineRange: { start: Date; end: Date } | null;
    setTimelineRange: Dispatch<SetStateAction<{ start: Date; end: Date } | null>>;
    hoveredTaskId: number | null;
    setHoveredTaskId: Dispatch<SetStateAction<number | null>>;
    isTodayVisible: boolean;
    setIsTodayVisible: Dispatch<SetStateAction<boolean>>;
    hasScrolledToToday: boolean;
    setHasScrolledToToday: Dispatch<SetStateAction<boolean>>;
    dayWidth: number;
    setDayWidth: Dispatch<SetStateAction<number>>;
    timelineScrollRef: RefObject<HTMLDivElement>;
}

const taskTimelineContextDefaultValue: TaskTimelineContextData = {
    timelineRange: null,
    setTimelineRange: () => {},
    hoveredTaskId: null,
    setHoveredTaskId: () => {},
    isTodayVisible: true,
    setIsTodayVisible: () => {},
    hasScrolledToToday: false,
    setHasScrolledToToday: () => {},
    dayWidth: DEFAULT_DAY_WIDTH,
    setDayWidth: () => {},
    timelineScrollRef: { current: null },
};

const TaskTimelineStore = createContext<TaskTimelineContextData>(taskTimelineContextDefaultValue);

export const useTaskTimelineStore = () => useContext(TaskTimelineStore);

export const TaskTimelineProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
    const [isTodayVisible, setIsTodayVisible] = useState(true);
    const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
    const timelineScrollRef = useRef<HTMLDivElement>(null);

    const [dayWidth, setDayWidth] = useState(() => {
        const stored = storageService.get<number>(STORAGE_KEY_ZOOM);
        return stored && stored >= MIN_DAY_WIDTH && stored <= MAX_DAY_WIDTH ? stored : DEFAULT_DAY_WIDTH;
    });

    return (
        <TaskTimelineStore.Provider
            value={{
                timelineRange, setTimelineRange,
                hoveredTaskId, setHoveredTaskId,
                isTodayVisible, setIsTodayVisible,
                hasScrolledToToday, setHasScrolledToToday,
                dayWidth, setDayWidth,
                timelineScrollRef,
            }}
        >
            {children}
        </TaskTimelineStore.Provider>
    );
};
