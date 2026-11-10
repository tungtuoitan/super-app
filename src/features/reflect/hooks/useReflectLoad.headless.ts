/** Loads the saved rows once when the journal opens */

import { useEffect } from "react";
import { reflectService } from "../service/reflect.service";
import { useReflectStore } from "../store/useReflect.store";
import { toReflectRow } from "../utils/reflect.utils";

export const useReflectLoadHeadless = () => {
    useEffect(() => {
        let alive = true;
        const { loadStarted, loaded, loadFailed } = useReflectStore.getState().actions;
        loadStarted();
        reflectService
            .getEntries()
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
    }, []);
};
