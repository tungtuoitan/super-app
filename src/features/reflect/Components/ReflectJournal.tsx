/**
 * ReflectJournal — the Reflect module's editor tab: the same Type | I think | Reality sheet as the task
 * Reflect tab, kept as a standalone journal. Rows save by themselves; a small label shows the state.
 * The sheet is a privacy zone: its text is tiny until the app-wide privacy mode is switched to visible.
 */

import { Search } from "lucide-react";
import { ReflectSheet } from "@/features/taskDetail";
import { PrivacyToggle, privacyConstants, usePrivacyIsHidden } from "@/shared";
import { cn } from "@/lib/utils";
import { reflectConstants } from "../reflect.constants";
import { useReflectJournalHelper } from "../hooks/useReflectJournal.helper";
import { useReflectLoadHeadless } from "../hooks/useReflectLoad.headless";
import { useReflectHasError, useReflectIsLoading, useReflectSaveState } from "../Selectors/useReflect.selector";

export function ReflectJournal() {
    useReflectLoadHeadless();
    const { rows, searchText, searchInputRef, setSearchText, typeOptions, handleFieldChange, handleAddRow } = useReflectJournalHelper();
    const saveState = useReflectSaveState();
    const isLoading = useReflectIsLoading();
    const hasError = useReflectHasError();
    const isPrivacyHidden = usePrivacyIsHidden();

    return (
        <div className="flex h-full w-full flex-col px-3 pt-3">
            <div className="flex h-6 items-center justify-between">
                <h2 className="text-[13px] font-medium text-foreground">{reflectConstants.journalTitle}</h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder={reflectConstants.searchPlaceholder}
                            aria-label={reflectConstants.searchLabel}
                            className={reflectConstants.searchInputClass}
                        />
                    </div>
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
                    regrowKey={`${isLoading}-${isPrivacyHidden}-${searchText.trim()}`}
                    searchText={searchText.trim()}
                />
            </div>
        </div>
    );
}
