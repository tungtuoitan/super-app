export type TimelineScale = "day" | "week" | "month" | "quarter" | "year";

export interface TimelineHeaderCell {
    label: string;
    title?: string;
    /** width in px */
    width: number;
    /** column contains today */
    isCurrent?: boolean;
    /** right border is a major boundary (solid instead of dashed) */
    isMajor?: boolean;
}

export interface TimelineScaleHeader {
    groups: TimelineHeaderCell[];
    columns: TimelineHeaderCell[];
}
