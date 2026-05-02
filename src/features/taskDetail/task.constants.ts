import React from "react";
import { ListOrdered, CheckSquare, FileText, MessageSquare, FilePlus } from "lucide-react";
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
    { key: "process", label: "Process", icon: ListOrdered },
    { key: "checklist", label: "Checklist", icon: CheckSquare },
    { key: "desc", label: "Description", icon: FileText },
    { key: "comment", label: "Comment", icon: MessageSquare },
];

export const TAB_COLORS: Record<string, { active: string }> = {
    process: { active: "border-purple-500 text-purple-500" },
    checklist: { active: "border-amber-500 text-amber-500" },
    desc: { active: "border-emerald-500 text-emerald-500" },
    comment: { active: "border-sky-500 text-sky-500" },
    custom: { active: "border-cyan-500 text-cyan-500" },
};

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
