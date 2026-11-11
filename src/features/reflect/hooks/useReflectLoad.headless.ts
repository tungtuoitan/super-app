/** Loads the saved rows when the journal opens, and again whenever the saved Created Date filter changes */

import { useEffect } from "react";
import { useReflectCreatedAtFilter } from "../Selectors/useReflect.selector";
import { reflectService } from "../service/reflect.service";
import { useReflectStore } from "../store/useReflect.store";
import { toReflectRow } from "../utils/reflect.utils";

export const useReflectLoadHeadless = () => {
    const createdAtFilter = useReflectCreatedAtFilter();

    useEffect(() => {
        let alive = true;
        const { loadStarted, loaded, loadFailed } = useReflectStore.getState().actions;
        loadStarted();
        reflectService
            .getEntries(createdAtFilter)
            .then((res) => {
                if (alive) loaded((res.data ?? []).map(toReflectRow));
            })
            .catch((error) => {
                console.error("Reflect load failed", error);
                if (alive) loadFailed();
            });
        return () => {
            alive = false;
        };
    }, [createdAtFilter]);
};
