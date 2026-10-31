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
