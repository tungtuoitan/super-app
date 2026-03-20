/**
 * LifeLog Feature Types
 * Domain models and DTOs for the LifeLog feature
 */

// Log types available
export type LogType =
    | "track"      // auto-created when tapping a track
    | "event"      // external event that happened
    | "reflection" // thoughts / feelings
    | "lesson"     // lesson learned
    | "mistake"    // mistake made
    | "note"       // general note / knowledge
    | "moment"     // captured moment (photo, memory)
    | "progress";  // evidence of progress

export const LOG_TYPES: readonly LogType[] = [
    "track", "event", "reflection", "lesson", "mistake", "note", "moment", "progress"
] as const;

// ─── Domain Models ──────────────────────────────────────────────────────────

export interface LifeLogTrack {
    id: number;
    userId?: number;
    name: string;
    emoji?: string;
    description?: string;
    isSensitive: boolean;
    color?: string;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt: Date | null;
}

export interface LifeLogLog {
    id: number;
    userId?: number;
    type: LogType;
    trackId?: number;
    title?: string;
    description?: string;
    isSensitive: boolean;
    location?: string;
    occurAt?: Date;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt: Date | null;
}

// ─── Backend DTOs (ISO date strings) ────────────────────────────────────────

export interface LifeLogTrackDTO {
    id: number;
    userId: number;
    name: string;
    emoji?: string;
    description?: string;
    isSensitive: boolean;
    color?: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface LifeLogLogDTO {
    id: number;
    userId: number;
    type: string;
    trackId?: number | null;
    title?: string | null;
    description?: string | null;
    isSensitive: boolean;
    location?: string | null;
    occurAt?: string | null;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface UpsertLifeLogTrackDTO {
    id: number;
    name: string;
    emoji?: string;
    description?: string;
    isSensitive?: boolean;
    color?: string;
    deletedAt?: string | null;
}

export interface UpsertLifeLogLogDTO {
    id: number;
    type: LogType;
    trackId?: number;
    title?: string;
    description?: string;
    isSensitive?: boolean;
    location?: string;
    occurAt?: string;
    deletedAt?: string | null;
}

// ─── Log type display config ─────────────────────────────────────────────────

export const LOG_TYPE_CONFIG: Record<LogType, { label: string; color: string; lucideIcon: string }> = {
    track:      { label: "Track",      color: "#6366f1", lucideIcon: "Zap" },
    event:      { label: "Event",      color: "#f472b6", lucideIcon: "SquareDashedMousePointer" },
    reflection: { label: "Reflection", color: "#a78bfa", lucideIcon: "MessageCircle" },
    lesson:     { label: "Lesson",     color: "#34d399", lucideIcon: "GraduationCap" },
    mistake:    { label: "Mistake",    color: "#f87171", lucideIcon: "ThumbsDown" },
    note:       { label: "Note",       color: "#fbbf24", lucideIcon: "NotebookPen" },
    moment:     { label: "Moment",     color: "#38bdf8", lucideIcon: "Scan" },
    progress:   { label: "Progress",   color: "#2dd4bf", lucideIcon: "LoaderCircle" },
};

// ─── Track color type ────────────────────────────────────────────────────────

export interface TrackColor {
    name: string;
    hex: string;
}

// ─── Graph types ─────────────────────────────────────────────────────────────

export type GraphMode = "frequency" | "count";

export interface DateRangeOption {
    label: string;
    days: number | null;
}

export interface FreqPoint {
    x: number;
    y: number;
    count: number;
    logIds: number[];
}

export interface FreqTrack {
    track: LifeLogTrack;
    trackIdx: number;
    points: FreqPoint[];
}
