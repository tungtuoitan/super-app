import { useState } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommentFilterType = "all" | "comment" | "process" | "checklist" | "desc" | "custom";

export const COMMENT_FILTERS: Array<{ key: CommentFilterType; label: string }> = [
    { key: "all", label: "All" },
    { key: "comment", label: "Comments" },
    { key: "process", label: "Process" },
    { key: "checklist", label: "Checklist" },
    { key: "desc", label: "Description" },
    { key: "custom", label: "Custom tabs" },
];

export function CommentFilterDropdown({ value, onChange, showDetail, onShowDetailChange }: {
    value: CommentFilterType; onChange: (v: CommentFilterType) => void;
    showDetail: boolean; onShowDetailChange: (v: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="flex items-center gap-1.5 pr-1">
            {/* Show detail toggle */}
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                <input type="checkbox" checked={showDetail} onChange={(e) => onShowDetailChange(e.target.checked)}
                    className="h-3 w-3 rounded border-border accent-primary cursor-pointer" />
                Detail
            </label>

            {/* Filter dropdown */}
            <div className="relative">
                <button onClick={() => setOpen((p) => !p)} className={cn(
                    "flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors",
                    value !== "all" ? "border-sky-500/40 text-sky-500 bg-sky-500/10" : "border-border text-muted-foreground hover:text-foreground",
                )}>
                    <Filter className="h-3 w-3" />
                    {COMMENT_FILTERS.find((f) => f.key === value)?.label ?? "All"}
                </button>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[130px]">
                            {COMMENT_FILTERS.map((f) => (
                                <button key={f.key} onClick={() => { onChange(f.key); setOpen(false); }}
                                    className={cn("w-full text-left text-xs px-3 py-1.5 hover:bg-muted transition-colors", value === f.key && "text-primary font-medium")}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
