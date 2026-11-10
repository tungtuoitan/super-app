/**
 * Reflect journal helper — connects the store to the sheet. Each row is written to the database on its
 * own (see useReflectSaver), so there is no Save button.
 */

import { nowInstantISO } from "@/shared";
import { buildReflectTypeOptions } from "@/features/taskDetail";
import type { ReflectField } from "@/features/taskDetail";
import { useReflectRows, useReflectStoreActions } from "../Selectors/useReflect.selector";
import { useReflectSaverHelper } from "./useReflectSaver.helper";

export const useReflectJournalHelper = () => {
    const rows = useReflectRows();
    const { fieldChanged, rowAdded } = useReflectStoreActions();
    const { scheduleSave } = useReflectSaverHelper();

    const handleFieldChange = (rowId: string, field: ReflectField, value: string) => {
        fieldChanged({ rowId, field, value, nowIso: nowInstantISO() });
        scheduleSave(rowId);
    };

    return { rows, typeOptions: buildReflectTypeOptions(rows), handleFieldChange, handleAddRow: rowAdded };
};
