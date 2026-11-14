/**
 * ReflectJournal — the Reflect module's page: the charts on top, then the Type | I think | Reality sheet
 * (the same sheet as the task Reflect tab). By default the sheet shows only the rows worth reading, which Claude
 * marks when it processes them; "Show all" or a search opens every row. Rows save by themselves.
 * The body is a privacy zone: its text is tiny until the app-wide privacy mode is switched to visible.
 */

import { ReflectSheet } from "@/features/taskDetail";
import { PrivacyToggle, privacyConstants, usePrivacyIsHidden } from "@/shared";
import { cn } from "@/lib/utils";
import { reflectConstants } from "../reflect.constants";
import { useReflectJournalHelper } from "../hooks/useReflectJournal.helper";
import { useReflectLoadHeadless } from "../hooks/useReflectLoad.headless";
import { useReflectHasError, useReflectIsLoading, useReflectSaveState } from "../Selectors/useReflect.selector";
import { ReflectCharts } from "./ReflectCharts";
import { ReflectSearchBox } from "./small/ReflectSearchBox";
import { ReflectShowAllToggle } from "./small/ReflectShowAllToggle";
import { ReflectTagSelect } from "./small/ReflectTagSelect";

export function ReflectJournal() {
    useReflectLoadHeadless();
    const journal = useReflectJournalHelper();
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
            <div {...privacyConstants.zoneProps} className="min-h-0 flex-1 overflow-y-auto pb-4">
                <ReflectCharts />
                <section className="mt-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <div className={reflectConstants.sectionTitleClass}>{reflectConstants.rowsTitle}</div>
                        <div className="flex items-center gap-3">
                            <ReflectShowAllToggle hiddenCount={journal.hiddenCount} />
                            <ReflectTagSelect />
                            <ReflectSearchBox />
                        </div>
                    </div>
                    <div className={cn(reflectConstants.sheetBoxClass, reflectConstants.sheetCellClass)}>
                        <ReflectSheet
                            rows={journal.rows}
                            isDisabled={isLoading}
                            typeOptions={journal.typeOptions}
                            onFieldChange={journal.handleFieldChange}
                            onAddRow={journal.handleAddRow}
                            regrowKey={`${isLoading}-${isPrivacyHidden}-${journal.appliedSearch}-${journal.hiddenCount}`}
                            searchText={journal.appliedSearch}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
