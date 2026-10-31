/**
 * TaskReflect — the Reflect tab: a three-column sheet (Type | I think | Reality).
 * Every cell is an input. Changes light up the section Save button (Ctrl+S when only this section is dirty); a row cleared completely is dropped on save.
 */

import { Plus } from "lucide-react";
import { GenericAutoComplete, Textarea } from "@/shared";
import { cn } from "@/lib/utils";
import { useTaskReflectHelper } from "../hooks/taskReflect/useTaskReflect.helper";
import { useTaskReflectHeadless } from "../hooks/taskReflect/useTaskReflect.headless";

const GRID = "grid grid-cols-1 md:grid-cols-[9.5rem_minmax(0,1fr)_minmax(0,1fr)]";

const CELL_TEXTAREA =
    "block min-h-[2.25rem] w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-3 py-2 text-[13px] leading-5 shadow-none focus-visible:bg-sa-hover focus-visible:ring-0 disabled:cursor-default disabled:opacity-100";

const TYPE_CELL =
    "group/type [&_button_span.rounded-sm]:opacity-0 [&_button_span.rounded-sm]:transition-opacity group-hover/type:[&_button_span.rounded-sm]:opacity-100 group-focus-within/type:[&_button_span.rounded-sm]:opacity-100 [&_button]:h-9 [&_button]:rounded-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-[13px] [&_button]:shadow-none [&_button:hover]:bg-sa-hover";

function HeaderRow() {
    return (
        <div className={cn(GRID, "hidden border-b border-sa-border bg-sa-surface-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid")}>
            <div className="px-3 py-1.5">Type</div>
            <div className="border-l border-sa-border px-3 py-1.5">I think</div>
            <div className="border-l border-sa-border px-3 py-1.5">Reality</div>
        </div>
    );
}

export function TaskReflect() {
    const { containerRef, rows, isDirty, isDisabled, typeOptions, handleFieldChange, handleAddRow, autoGrow, save, discard } = useTaskReflectHelper();
    useTaskReflectHeadless({ isDirty, save, discard });

    return (
        <div ref={containerRef} className="flex h-full flex-col gap-2 overflow-y-auto pt-1">
            <div className="overflow-hidden rounded-xl border border-sa-border">
                <HeaderRow />
                {rows.length === 0 && (
                    <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                        Nothing here yet. Add a row, write what you think before you start, and fill in the reality afterwards.
                    </div>
                )}
                {rows.map((row, index) => (
                    <div key={row.id} className={cn(GRID, index > 0 && "border-t border-sa-border")}>
                        <div className={TYPE_CELL}>
                            <GenericAutoComplete
                                size="tiny"
                                value={row.type ? { id: row.type, label: row.type } : null}
                                allOptions={typeOptions}
                                disabled={isDisabled}
                                inputProps={{ name: "reflect-type", label: "", placeholder: "Type" }}
                                onChange={(_, option) => handleFieldChange(row.id, "type", option?.label ?? "")}
                            />
                        </div>
                        <div className="md:border-l md:border-sa-border">
                            <Textarea
                                ref={autoGrow}
                                rows={1}
                                value={row.think}
                                disabled={isDisabled}
                                placeholder="I think…"
                                aria-label="I think"
                                className={CELL_TEXTAREA}
                                onChange={(e) => handleFieldChange(row.id, "think", e.target.value)}
                            />
                        </div>
                        <div className="md:border-l md:border-sa-border">
                            <Textarea
                                ref={autoGrow}
                                rows={1}
                                value={row.real}
                                disabled={isDisabled}
                                placeholder="Reality…"
                                aria-label="Reality"
                                className={CELL_TEXTAREA}
                                onChange={(e) => handleFieldChange(row.id, "real", e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {!isDisabled && (
                <button
                    onClick={handleAddRow}
                    className="flex h-7 w-fit items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add row
                </button>
            )}
        </div>
    );
}
