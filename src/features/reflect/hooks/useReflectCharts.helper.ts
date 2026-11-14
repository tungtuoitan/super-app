/** Loads the chart data (numbers read out of the journal) when the Charts view opens (it is only mounted then), and can scan right away */

import { useCallback, useEffect } from "react";
import { reflectConstants } from "../reflect.constants";
import { reflectService } from "../service/reflect.service";
import { formatReflectScanResult } from "../utils/reflect.utils";
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
        let message = "";
        try {
            const result = await reflectService.scanNow();
            message = formatReflectScanResult(result);
            await load();
        } catch (error) {
            console.error(reflectConstants.messages.scanFailed, error);
            message = reflectConstants.messages.scanFailed;
        } finally {
            scanEnded(message);
        }
    };

    return { scanNow };
};
