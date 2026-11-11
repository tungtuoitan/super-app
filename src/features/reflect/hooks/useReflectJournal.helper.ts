/**
 * Reflect journal helper — connects the store to the sheet. Each row is written to the database on its
 * own (see useReflectSaver), so there is no Save button.
 */

import { useEffect, useRef, useState } from "react";
import { nowInstantISO } from "@/shared";
import { buildReflectTypeOptions, reflectRowMatchesSearch } from "@/features/taskDetail";
import type { ReflectField } from "@/features/taskDetail";
import { reflectConstants } from "../reflect.constants";
import { useReflectRows, useReflectStoreActions } from "../Selectors/useReflect.selector";
import { useReflectSaverHelper } from "./useReflectSaver.helper";

export const useReflectJournalHelper = () => {
    const rows = useReflectRows();
    const [searchText, setSearchText] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    // The box answers every key at once; the (heavier) filter and highlight follow once typing pauses
    const [appliedSearch, setAppliedSearch] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setAppliedSearch(searchText.trim()), reflectConstants.searchDebounceMs);
        return () => clearTimeout(timer);
    }, [searchText]);

    // Ctrl+F searches the journal instead of the browser page (only while this journal is on screen)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const input = searchInputRef.current;
            if (!input || input.offsetParent === null) return;
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                input.focus();
                input.select();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
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
    const shownRows = needle ? newestFirstRows.filter((r) => reflectRowMatchesSearch(r, needle)) : newestFirstRows;

    return {
        rows: shownRows,
        searchText,
        appliedSearch,
        searchInputRef,
        setSearchText,
        typeOptions: buildReflectTypeOptions(rows),
        handleFieldChange,
        handleAddRow: rowAdded,
    };
};
