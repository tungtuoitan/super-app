import { useState } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/shared";
import type { CommentFilterType } from "../../types/taskComment.types";
import { COMMENT_FILTERS } from "../../task.constants";

export function CommentFilterDropdown({ value, onChange, showDetail, onShowDetailChange }: {
    value: CommentFilterType; onChange: (v: CommentFilterType) => void;
    showDetail: boolean; onShowDetailChange: (v: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="flex items-center gap-1.5 pr-1">
            <label className="flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground">
                <Checkbox checked={showDetail} onCheckedChange={(v) => onShowDetailChange(v === true)} />
                Detail
            </label>

            <div className="relative">
                <button onClick={() => setOpen((p) => !p)} className={cn(
                    "flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors duration-100 hover:bg-sa-hover",
                    value !== "all" ? "border-sa-border-strong text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}>
                    {value !== "all" ? <span className="h-1.5 w-1.5 rounded-full bg-sa-amber" /> : <Filter className="h-3 w-3" />}
                    {COMMENT_FILTERS.find((f) => f.key === value)?.label ?? "All"}
                </button>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <div className="sa-shadow-pop absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-sa-border bg-popover p-1">
                            {COMMENT_FILTERS.map((f) => (
                                <button key={f.key} onClick={() => { onChange(f.key); setOpen(false); }}
                                    className={cn("flex h-7 w-full items-center rounded-md px-2 text-left text-[13px] transition-colors duration-100 hover:bg-sa-hover-strong", value === f.key ? "font-medium text-foreground" : "text-muted-foreground")}>
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
