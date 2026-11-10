/**
 * ReflectJournal — the Reflect module's editor tab: the same Type | I think | Reality sheet as the task
 * Reflect tab, kept as a standalone journal. Rows save by themselves; a small label shows the state.
 * The sheet is a privacy zone: its text is tiny until the app-wide privacy mode is switched to visible.
 */

import { ReflectSheet } from "@/features/taskDetail";
import { PrivacyToggle, privacyConstants, usePrivacyIsHidden } from "@/shared";
import { cn } from "@/lib/utils";
import { reflectConstants } from "../reflect.constants";
import { useReflectJournalHelper } from "../hooks/useReflectJournal.helper";
import { useReflectLoadHeadless } from "../hooks/useReflectLoad.headless";
import { useReflectHasError, useReflectIsLoading, useReflectSaveState } from "../Selectors/useReflect.selector";

export function ReflectJournal() {
    useReflectLoadHeadless();
    const { rows, typeOptions, handleFieldChange, handleAddRow } = useReflectJournalHelper();
    const saveState = useReflectSaveState();
    const isLoading = useReflectIsLoading();
    const hasError = useReflectHasError();
    const isPrivacyHidden = usePrivacyIsHidden();

    return (
        <div className="flex h-full w-full flex-col px-3 pt-3">
            <div className="flex h-6 items-center justify-between">
                <h2 className="text-[13px] font-medium text-foreground">{reflectConstants.journalTitle}</h2>
                <div className="flex items-center gap-3">
                    <span className={hasError ? "text-[12px] text-destructive" : "text-[12px] text-muted-foreground"}>{reflectConstants.stateLabels[saveState]}</span>
                    <PrivacyToggle />
                </div>
            </div>
            <div {...privacyConstants.zoneProps} className={cn("min-h-0 flex-1", reflectConstants.sheetCellClass)}>
                <ReflectSheet
                    rows={rows}
                    isDisabled={isLoading}
                    typeOptions={typeOptions}
                    onFieldChange={handleFieldChange}
                    onAddRow={handleAddRow}
                    regrowKey={`${isLoading}-${isPrivacyHidden}`}
                />
            </div>
        </div>
    );
}
