/**
 * Task visual types — status/priority icon shapes and palette entries (#1514).
 */

/** Linear-style status glyphs */
export type TaskStatusShape = "ring" | "half" | "dot" | "dashed" | "check" | "cross";

export interface TaskStatusVisual {
    /** Icon / indicator color (hex — consumers may append alpha, e.g. `${color}30`) */
    color: string;
    /** Readable text color when `color` is used as a solid fill */
    ink: string;
    shape: TaskStatusShape;
}

export interface TaskPriorityVisual {
    /** Color of the filled bars (hex) */
    color: string;
    /** Readable text color when `color` is used as a solid fill */
    ink: string;
    /** Number of filled bars (0–3) */
    level: 0 | 1 | 2 | 3;
}

export type DateTone = "overdue" | "today" | "normal";
