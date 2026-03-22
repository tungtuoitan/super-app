import { ListOrdered, CheckSquare, FileText, FilePlus } from "lucide-react";
import type React from "react";

export const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    process: { label: "Process updated", icon: ListOrdered, color: "text-muted-foreground/70" },
    checklist: { label: "Checklist updated", icon: CheckSquare, color: "text-muted-foreground/70" },
    desc: { label: "Description updated", icon: FileText, color: "text-muted-foreground/70" },
};

export const FALLBACK_CUSTOM_ICON = FilePlus;

export const COLLAPSE_HEIGHT = 120;
