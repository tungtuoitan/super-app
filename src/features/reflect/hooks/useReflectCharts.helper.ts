/** Loads the chart data (things read out of the journal) when the Charts view opens; the view is only mounted then */

import { useEffect } from "react";
import { reflectConstants } from "../reflect.constants";
import { reflectService } from "../service/reflect.service";
import { useReflectChartsActions } from "../Selectors/useReflectCharts.selector";

export const useReflectChartsHelper = () => {
    const { loadStarted, loaded, loadFailed } = useReflectChartsActions();

    useEffect(() => {
        let alive = true;
        loadStarted();
        reflectService
            .getSeries()
            .then((series) => {
                if (alive) loaded(series);
            })
            .catch((error) => {
                console.error(reflectConstants.messages.chartsLoadFailed, error);
                if (alive) loadFailed();
            });
        return () => {
            alive = false;
        };
    }, [loadStarted, loaded, loadFailed]);
};
