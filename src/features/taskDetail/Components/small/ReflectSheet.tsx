/**
 * ReflectSheet — the three-column sheet (Type | I think | Reality) shared by the task Reflect tab and
 * the project Reflect tab. Presentational: rows and handlers come from the caller's helper.
 */

import { useCallback, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import type { IAutoCompleteOptions } from "@/shared";
import { cn } from "@/lib/utils";
import type { ReflectField, ReflectRow } from "../../types/taskReflect.types";
import { REFLECT_COLUMN_COLORS, REFLECT_SHEET_GRID } from "../../task.constants";
import { useReflectThinkLockHelper } from "../../hooks/taskReflect/useReflectThinkLock.helper";
import { autoGrowTextarea } from "../../utils/taskReflect.utils";
import { ReflectRowView } from "./ReflectRowView";

function HeaderRow() {
    return (
        <div className={cn(REFLECT_SHEET_GRID, "sticky top-0 z-10 hidden border-b border-sa-border bg-sa-surface-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid")}>
            <div className={cn("flex items-center gap-1.5 px-3 py-1.5", REFLECT_COLUMN_COLORS.think.tint)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", REFLECT_COLUMN_COLORS.think.dot)} />
                <span className={REFLECT_COLUMN_COLORS.think.text}>I think</span>
            </div>
            <div className={cn("flex items-center gap-1.5 border-l border-sa-border px-3 py-1.5", REFLECT_COLUMN_COLORS.real.tint)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", REFLECT_COLUMN_COLORS.real.dot)} />
                <span className={REFLECT_COLUMN_COLORS.real.text}>Reality</span>
            </div>
            <div className="border-l border-sa-border px-3 py-1.5">Type</div>
        </div>
    );
}

interface ReflectSheetProps {
    rows: ReflectRow[];
    isDisabled: boolean;
    typeOptions: IAutoCompleteOptions[];
    onFieldChange: (rowId: string, field: ReflectField, value: string) => void;
    onAddRow: () => void;
    /** Changes when the sheet becomes visible (tabs are mounted while hidden, so cell heights must be measured again) */
    regrowKey: string;
    /** Text to highlight in the cells (rows are already narrowed by the caller); empty means no highlight */
    searchText?: string;
}

export function ReflectSheet({ rows, isDisabled, typeOptions, onFieldChange, onAddRow, regrowKey, searchText = "" }: ReflectSheetProps) {
    // A stable handler, so the memoized rows are not re-rendered by every keystroke
    const onFieldChangeRef = useRef(onFieldChange);
    onFieldChangeRef.current = onFieldChange;
    const handleFieldChange = useCallback((rowId: string, field: ReflectField, value: string) => onFieldChangeRef.current(rowId, field, value), []);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isThinkLocked } = useReflectThinkLockHelper();

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            containerRef.current?.querySelectorAll("textarea").forEach(autoGrowTextarea);
        });
        return () => cancelAnimationFrame(frame);
    }, [regrowKey, rows.length]);

    return (
        <div ref={containerRef} className="flex h-full flex-col gap-2 pt-1">
            {/* The table fills the height it is given and scrolls inside itself; the header stays put */}
            <div className="min-h-0 overflow-y-auto rounded-xl border border-sa-border">
                <HeaderRow />
                {rows.length === 0 && (
                    <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                        Nothing here yet. Add a row, write what you think before you start, and fill in the reality afterwards.
                    </div>
                )}
                {rows.map((row, index) => (
                    <ReflectRowView
                        key={row.id}
                        row={row}
                        hasBorder={index > 0}
                        isDisabled={isDisabled}
                        isThinkDisabled={isDisabled || isThinkLocked(row)}
                        typeOptions={typeOptions}
                        searchText={searchText}
                        onFieldChange={handleFieldChange}
                    />
                ))}
            </div>
            {!isDisabled && (
                <button
                    onClick={onAddRow}
                    className="flex h-7 w-fit items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add row
                </button>
            )}
        </div>
    );
}
