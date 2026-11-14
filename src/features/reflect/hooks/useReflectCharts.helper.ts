/** Loads the chart data (numbers read out of the journal) when the Charts view opens (it is only mounted then), and can scan right away */

import { useCallback, useEffect } from "react";
import { reflectConstants } from "../reflect.constants";
import { reflectService } from "../service/reflect.service";
import { useReflectChartsActions } from "../Selectors/useReflectCharts.selector";

export const useReflectChartsHelper = () => {
    const { loadStarted, loaded, loadFailed, scanStarted, scanEnded } = useReflectChartsActions();

    const load = useCallback(async () => {
        loadStarted();
        try {
            loaded(await reflectService.getSeries());
        } catch (error) {
            console.error(reflectConstants.messages.chartsLoadFailed, error);
            loadFailed();
        }
    }, [loadStarted, loaded, loadFailed]);

    useEffect(() => {
        void load();
    }, [load]);

    const scanNow = async () => {
        scanStarted();
        try {
            await reflectService.scanNow();
            await load();
        } catch (error) {
            console.error(reflectConstants.messages.scanFailed, error);
        } finally {
            scanEnded();
        }
    };

    return { scanNow };
};
