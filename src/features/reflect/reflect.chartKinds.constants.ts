/** The chart shapes of the Charts view, looked up by how a metric combines the values of one day. A new shape is a new entry. */

import type { ComponentType } from "react";
import { ReflectBarKind } from "./Components/small/ReflectBarKind";
import { ReflectLineKind } from "./Components/small/ReflectLineKind";
import type { ReflectChartKindProps, ReflectSeriesDTO } from "./types/reflect.types";

export const REFLECT_CHART_KINDS: Record<ReflectSeriesDTO["aggregate"], ComponentType<ReflectChartKindProps>> = {
    sum: ReflectBarKind,
    avg: ReflectLineKind,
    max: ReflectLineKind,
};
