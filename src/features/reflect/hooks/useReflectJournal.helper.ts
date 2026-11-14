/**
 * Reflect journal helper — connects the store to the sheet. Each row is written to the database on its
 * own (see useReflectSaver), so there is no Save button.
 */

import { useEffect, useState } from "react";
import { nowInstantISO } from "@/shared";
import { buildReflectTypeOptions, reflectRowMatchesSearch } from "@/features/taskDetail";
import type { ReflectField } from "@/features/taskDetail";
import { reflectConstants } from "../reflect.constants";
import { filterReflectRowsByTag, isReflectRowShownByDefault } from "../utils/reflect.utils";
import { useReflectLoadedIds, useReflectRows, useReflectStoreActions } from "../Selectors/useReflect.selector";
import { useReflectSearchText, useReflectShowAll, useReflectTagFilter } from "../Selectors/useReflectView.selector";
import { useReflectSaverHelper } from "./useReflectSaver.helper";

export const useReflectJournalHelper = () => {
    const rows = useReflectRows();
    const searchText = useReflectSearchText();
    const tagFilter = useReflectTagFilter();
    const showAll = useReflectShowAll();
    const loadedIds = useReflectLoadedIds();

    // The box answers every key at once; the (heavier) filter and highlight follow once typing pauses
    const [appliedSearch, setAppliedSearch] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setAppliedSearch(searchText.trim()), reflectConstants.searchDebounceMs);
        return () => clearTimeout(timer);
    }, [searchText]);

    const { fieldChanged, rowAdded } = useReflectStoreActions();
    const { scheduleSave } = useReflectSaverHelper();

    const handleFieldChange = (rowId: string, field: ReflectField, value: string) => {
        fieldChanged({ rowId, field, value, nowIso: nowInstantISO() });
        scheduleSave(rowId);
    };

    // The store keeps oldest first with the empty row last; the journal shows the newest on top, so the empty row is on top
    const newestFirstRows = [...rows].reverse();

    // While searching, only the rows that contain the text (in any column) stay
    const needle = appliedSearch.toLowerCase();
    const searchedRows = needle ? newestFirstRows.filter((r) => reflectRowMatchesSearch(r, needle)) : newestFirstRows;

    // A chosen tag narrows the rows to that kind
    const taggedRows = filterReflectRowsByTag(searchedRows, tagFilter);

    // By default only the rows worth reading; a search or "Show all" looks through every row
    const isNarrowed = !showAll && !needle;
    const shownRows = isNarrowed ? taggedRows.filter((r) => isReflectRowShownByDefault(r, loadedIds)) : taggedRows;

    return {
        rows: shownRows,
        appliedSearch,
        hiddenCount: taggedRows.length - shownRows.length,
        typeOptions: buildReflectTypeOptions(rows),
        handleFieldChange,
        handleAddRow: rowAdded,
    };
};
