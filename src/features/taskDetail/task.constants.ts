import React from "react";
import { ListOrdered, CheckSquare, FileText, MessageSquare, FilePlus, Columns2 } from "lucide-react";
import type { BuiltinTab } from "./store/useTaskDetailSection.store";
import type { CommentFilterType } from "./types/taskComment.types";

// ── Checklist / Testcase environments ────────────────────────────────────────

export const TESTCASE_ENVIRONMENTS = ["LOCAL", "DEV", "UAT", "PROD"] as const;

export type TestcaseEnvironment = (typeof TESTCASE_ENVIRONMENTS)[number];

export const REQUIRED_ENVIRONMENTS: TestcaseEnvironment[] = ["LOCAL", "DEV"];

export const OPTIONAL_ENVIRONMENTS: TestcaseEnvironment[] = ["UAT", "PROD"];

export const DEFAULT_ENV: TestcaseEnvironment = "LOCAL";

export const BUILTIN_CHECKLIST_TEMPLATES: Record<string, string> = {};

// ── Comment filters ───────────────────────────────────────────────────────────

export const COMMENT_FILTERS: Array<{ key: CommentFilterType; label: string }> = [
    { key: "all", label: "All" },
    { key: "comment", label: "Comments" },
    { key: "process", label: "Process" },
    { key: "checklist", label: "Checklist" },
    { key: "desc", label: "Description" },
    { key: "custom", label: "Custom tabs" },
];

// ── Detail section tabs ───────────────────────────────────────────────────────

export const BUILTIN_TABS: Array<{ key: BuiltinTab; label: string; icon: React.ElementType }> = [
    { key: "reflect", label: "Reflect", icon: Columns2 },
    { key: "process", label: "Process", icon: ListOrdered },
    { key: "checklist", label: "Checklist", icon: CheckSquare },
    { key: "desc", label: "Description", icon: FileText },
    { key: "comment", label: "Comment", icon: MessageSquare },
];

// ── Reflect tab (type / I think / Reality) ────────────────────────────────────

/**
 * Section Save / Discard confirmation timing (ms) and easing: a quiet spring settle, a short hold, then a
 * dissolve; SectionSaveBar reports back when the dissolve ends.
 */
export const SAVED_TOAST = {
    /**
     * false = play the confirmation even when the OS has animations turned off (Windows "Show animations" off
     * reports prefers-reduced-motion). The effect is small and short; set true to honor the OS setting again.
     */
    honorReducedMotion: false,
    holdMs: 1100,
    dissolveMs: 320,
    /** Gently damped spring (zeta 0.78), about 2% overshoot, settles in about 0.5s */
    spring: "linear(0, 0.0722, 0.2301, 0.4117, 0.5817, 0.7238, 0.8329, 0.9109, 0.9627, 0.9942, 1.0112, 1.0185, 1.0199, 1.018, 1.0147, 1.0111, 1.0078, 1.005, 1.003, 1.0015, 1)",
    /** For browsers without CSS linear() */
    springFallback: "cubic-bezier(0.25, 1.05, 0.5, 1)",
} as const;

export const REFLECT_DEFAULT_TYPES = ["Plan", "Prediction", "Mindset", "Thought", "Decision", "Goal", "Risk", "Unknown"];

// ── Version comment / collapsible ─────────────────────────────────────────────

export const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    process: { label: "Process updated", icon: ListOrdered, color: "text-muted-foreground/70" },
    checklist: { label: "Checklist updated", icon: CheckSquare, color: "text-muted-foreground/70" },
    desc: { label: "Description updated", icon: FileText, color: "text-muted-foreground/70" },
};

export const FALLBACK_CUSTOM_ICON = FilePlus;

export const COLLAPSE_HEIGHT = 120;

// ── Drag-and-drop type identifier ─────────────────────────────────────────────
/** DnD accept type for task row dragging (used by TaskGrid and MultiProjectTaskList). */
export const TASK_ROW = "TASK_ROW";

// One colour per Reflect column so "what I thought" and "what happened" read as two different things
export const REFLECT_COLUMN_COLORS = {
    think: { tint: "bg-sky-500/[0.06]", dot: "bg-sky-400", text: "text-sky-300" },
    real: { tint: "bg-emerald-500/[0.06]", dot: "bg-emerald-400", text: "text-emerald-300" },
} as const;

/** A Reflect row that has a creation time (the journal's rows) can change "I think" only this long after it; the server enforces the same rule */
export const REFLECT_THINK_EDIT_WINDOW_MS = 3 * 60 * 1000;
/** How often an open Reflect sheet re-checks which rows have just become locked */
export const REFLECT_LOCK_CHECK_INTERVAL_MS = 5000;

// Reflect sheet layout (classes shared by the header and the rows)
export const REFLECT_SHEET_GRID = "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9.5rem]";
export const REFLECT_CELL_TEXT = "px-3 py-2 text-[13px] leading-5";
export const REFLECT_CELL_TEXTAREA =
    "relative block min-h-[2.25rem] w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-3 py-2 text-[13px] leading-5 shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100";
// The focus tint sits on the wrapper so the search highlight behind the textarea stays visible
export const REFLECT_CELL_WRAPPER = "relative focus-within:bg-sa-hover";
// The clear (x) button of the type picker only shows while the cell is hovered or focused
export const REFLECT_TYPE_CELL =
    "group/type [&_button_span.rounded-sm]:opacity-0 [&_button_span.rounded-sm]:transition-opacity group-hover/type:[&_button_span.rounded-sm]:opacity-100 group-focus-within/type:[&_button_span.rounded-sm]:opacity-100 [&_button]:h-9 [&_button]:rounded-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-[13px] [&_button]:shadow-none [&_button:hover]:bg-sa-hover";

// Read-only kind label under the Type picker (set by the Reflect nightly scan)
export const REFLECT_TAG_CHIP = "mx-3 mb-1 inline-block rounded bg-sa-hover px-1.5 text-[11px] capitalize leading-4 text-muted-foreground";
