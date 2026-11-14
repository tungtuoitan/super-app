/**
 * ReflectRowView — one Reflect row (I think | Reality | Type). Memoized so typing in a row does not
 * re-render the others; the option list only matters by its length.
 */

import { memo } from "react";
import { GenericAutoComplete, Textarea } from "@/shared";
import type { IAutoCompleteOptions } from "@/shared";
import { cn } from "@/lib/utils";
import type { ReflectField, ReflectRow } from "../../types/taskReflect.types";
import { REFLECT_CELL_TEXTAREA, REFLECT_CELL_WRAPPER, REFLECT_COLUMN_COLORS, REFLECT_SHEET_GRID, REFLECT_TAG_CHIP, REFLECT_TYPE_CELL } from "../../task.constants";
import { autoGrowTextarea } from "../../utils/taskReflect.utils";
import { ReflectSearchMirror } from "./ReflectSearchMirror";

interface ReflectRowViewProps {
    row: ReflectRow;
    hasBorder: boolean;
    isDisabled: boolean;
    isThinkDisabled: boolean;
    typeOptions: IAutoCompleteOptions[];
    searchText: string;
    onFieldChange: (rowId: string, field: ReflectField, value: string) => void;
}

function ReflectRowViewBase({ row, hasBorder, isDisabled, isThinkDisabled, typeOptions, searchText, onFieldChange }: ReflectRowViewProps) {
    const handleText = (field: "think" | "real") => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        autoGrowTextarea(e.target);
        onFieldChange(row.id, field, e.target.value);
    };

    return (
        <div className={cn(REFLECT_SHEET_GRID, hasBorder && "border-t border-sa-border")}>
            <div className={cn(REFLECT_CELL_WRAPPER, REFLECT_COLUMN_COLORS.think.tint)}>
                {searchText && <ReflectSearchMirror text={row.think} search={searchText} />}
                <Textarea
                    ref={autoGrowTextarea}
                    rows={1}
                    value={row.think}
                    disabled={isThinkDisabled}
                    placeholder="I think…"
                    aria-label="I think"
                    className={REFLECT_CELL_TEXTAREA}
                    onChange={handleText("think")}
                />
            </div>
            <div className={cn(REFLECT_CELL_WRAPPER, "md:border-l md:border-sa-border", REFLECT_COLUMN_COLORS.real.tint)}>
                {searchText && <ReflectSearchMirror text={row.real} search={searchText} />}
                <Textarea
                    ref={autoGrowTextarea}
                    rows={1}
                    value={row.real}
                    disabled={isDisabled}
                    placeholder="Reality…"
                    aria-label="Reality"
                    className={REFLECT_CELL_TEXTAREA}
                    onChange={handleText("real")}
                />
            </div>
            <div className={cn(REFLECT_TYPE_CELL, "md:border-l md:border-sa-border")}>
                <GenericAutoComplete
                    size="tiny"
                    value={row.type ? { id: row.type, label: row.type } : null}
                    allOptions={typeOptions}
                    disabled={isDisabled}
                    inputProps={{ name: "reflect-type", label: "", placeholder: "Type" }}
                    onChange={(_, option) => onFieldChange(row.id, "type", option?.label ?? "")}
                />
                {row.tag && <span className={REFLECT_TAG_CHIP}>{row.tag}</span>}
            </div>
        </div>
    );
}

export const ReflectRowView = memo(
    ReflectRowViewBase,
    (a, b) =>
        a.row === b.row &&
        a.hasBorder === b.hasBorder &&
        a.isDisabled === b.isDisabled &&
        a.isThinkDisabled === b.isThinkDisabled &&
        a.typeOptions.length === b.typeOptions.length &&
        a.searchText === b.searchText &&
        a.onFieldChange === b.onFieldChange,
);
