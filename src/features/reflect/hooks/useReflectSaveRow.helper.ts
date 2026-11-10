/** Writes one Reflect row (or deletes it when it was cleared) and records the result in the store */

import { useCallback } from "react";
import { reflectService } from "../service/reflect.service";
import { useReflectStoreActions } from "../Selectors/useReflect.selector";
import { useReflectStore } from "../store/useReflect.store";
import { decideReflectSave, toReflectUpsertRequest } from "../utils/reflect.utils";

export const useReflectSaveRowHelper = () => {
    const { saveStarted, rowStored, rowRemoved, saveFailed } = useReflectStoreActions();

    const saveRow = useCallback(
        async (rowId: string) => {
            const { rows, storedIds } = useReflectStore.getState();
            const row = rows.find((r) => r.id === rowId);
            if (!row) return;
            const step = decideReflectSave(row, storedIds.has(rowId));
            if (step === "skip") return;
            try {
                saveStarted();
                if (step === "upsert") {
                    await reflectService.upsertEntry(toReflectUpsertRequest(row));
                    rowStored(rowId);
                } else {
                    await reflectService.deleteEntry(rowId);
                    rowRemoved(rowId);
                }
            } catch (error) {
                console.error("Reflect save failed", error);
                saveFailed();
            }
        },
        [saveStarted, rowStored, rowRemoved, saveFailed],
    );

    return { saveRow };
};
