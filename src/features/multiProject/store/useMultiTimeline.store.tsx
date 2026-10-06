/**
 * Multi-Project Timeline Store
 * Context-based store for multi-project timeline view state.
 * Provider takes ONLY children — projectIds, projects, mode are state (set by parent via setters).
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { Project } from "@/features/project";
import { storageService } from "@/shared";

// Constants
export const DEFAULT_DAY_WIDTH = 40;
export const MIN_DAY_WIDTH = 20;
export const MAX_DAY_WIDTH = 80;
/** Project mode: 1 column = 1 week */
export const DEFAULT_WEEK_WIDTH = 84;
export const MIN_WEEK_WIDTH = 35;
export const MAX_WEEK_WIDTH = 210;
export const WEEK_ZOOM_STEP = 21;
export const WEEK_WIDTH_STORAGE_KEY = "pro_timeline_week_width";

export interface MultiTimelineContextData {
    // Config (set by parent via setters)
    projectIds: number[];
    setProjectIds: Dispatch<SetStateAction<number[]>>;
    projects: Project[];
    setProjects: Dispatch<SetStateAction<Project[]>>;
    mode: "task" | "project";
    setMode: Dispatch<SetStateAction<"task" | "project">>;
    storageKey: string;
    setStorageKey: Dispatch<SetStateAction<string>>;

    // Timeline state
    timelineRange: { start: Date; end: Date } | null;
    setTimelineRange: Dispatch<SetStateAction<{ start: Date; end: Date } | null>>;
    hoveredItemId: number | null;
    setHoveredItemId: Dispatch<SetStateAction<number | null>>;
    isTodayVisible: boolean;
    setIsTodayVisible: Dispatch<SetStateAction<boolean>>;
    hasScrolledToToday: boolean;
    setHasScrolledToToday: Dispatch<SetStateAction<boolean>>;
    dayWidth: number;
    setDayWidth: Dispatch<SetStateAction<number>>;
    weekWidth: number;
    setWeekWidth: Dispatch<SetStateAction<number>>;
    timelineScrollRef: RefObject<HTMLDivElement>;
}

const multiTimelineContextDefaultValue: MultiTimelineContextData = {
    projectIds: [],
    setProjectIds: () => {},
    projects: [],
    setProjects: () => {},
    mode: "task",
    setMode: () => {},
    storageKey: "multi_timeline_day_width",
    setStorageKey: () => {},
    timelineRange: null,
    setTimelineRange: () => {},
    hoveredItemId: null,
    setHoveredItemId: () => {},
    isTodayVisible: true,
    setIsTodayVisible: () => {},
    hasScrolledToToday: false,
    setHasScrolledToToday: () => {},
    dayWidth: DEFAULT_DAY_WIDTH,
    setDayWidth: () => {},
    weekWidth: DEFAULT_WEEK_WIDTH,
    setWeekWidth: () => {},
    timelineScrollRef: { current: null },
};

const MultiTimelineStore = createContext<MultiTimelineContextData>(multiTimelineContextDefaultValue);

export const useMultiTimelineStore = () => useContext(MultiTimelineStore);

export const MultiTimelineProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [projectIds, setProjectIds] = useState<number[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [mode, setMode] = useState<"task" | "project">("task");
    const [storageKey, setStorageKey] = useState("multi_timeline_day_width");
    const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
    const [isTodayVisible, setIsTodayVisible] = useState(true);
    const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
    const timelineScrollRef = useRef<HTMLDivElement>(null);

    const [dayWidth, setDayWidth] = useState(() => {
        const stored = storageService.get<number>("multi_timeline_day_width");
        return stored && stored >= MIN_DAY_WIDTH && stored <= MAX_DAY_WIDTH ? stored : DEFAULT_DAY_WIDTH;
    });

    const [weekWidth, setWeekWidth] = useState(() => {
        const stored = storageService.get<number>(WEEK_WIDTH_STORAGE_KEY);
        return stored && stored >= MIN_WEEK_WIDTH && stored <= MAX_WEEK_WIDTH ? stored : DEFAULT_WEEK_WIDTH;
    });

    return (
        <MultiTimelineStore.Provider
            value={{
                projectIds, setProjectIds,
                projects, setProjects,
                mode, setMode,
                storageKey, setStorageKey,
                timelineRange, setTimelineRange,
                hoveredItemId, setHoveredItemId,
                isTodayVisible, setIsTodayVisible,
                hasScrolledToToday, setHasScrolledToToday,
                dayWidth, setDayWidth,
                weekWidth, setWeekWidth,
                timelineScrollRef,
            }}
        >
            {children}
        </MultiTimelineStore.Provider>
    );
};
