import type { DailyLogFieldTemplate, DailyLogSection } from "./dailyLog.types";
import type { DRAG_TYPE } from "../dailyLogTemplate.constants";

export type DraftField = Omit<DailyLogFieldTemplate, "createdAt" | "updatedAt">;

export interface FieldDragItem {
    type: typeof DRAG_TYPE;
    visibleIdx: number;
    section: DailyLogSection;
}
