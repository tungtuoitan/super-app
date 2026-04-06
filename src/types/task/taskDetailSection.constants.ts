import React from "react";
import { ListOrdered, CheckSquare, FileText, MessageSquare } from "lucide-react";
import type { BuiltinTab } from "@/store/task/useTaskDetailSection.store";

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
