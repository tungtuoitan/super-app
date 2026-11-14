/** The chart shapes of the Charts view, looked up by how a metric is drawn. A new shape is a new entry. */

import type { ComponentType } from "react";
import { ReflectBarKind } from "./Components/small/ReflectBarKind";
import { ReflectFlagKind } from "./Components/small/ReflectFlagKind";
import { ReflectItemsKind } from "./Components/small/ReflectItemsKind";
import { ReflectClockKind, ReflectLineKind } from "./Components/small/ReflectLineKind";
import { ReflectListKind } from "./Components/small/ReflectListKind";
import type { ReflectChartKindProps, ReflectShape } from "./types/reflect.types";

export const REFLECT_CHART_KINDS: Record<Exclude<ReflectShape, "auto">, ComponentType<ReflectChartKindProps>> = {
    count: ReflectBarKind,
    level: ReflectLineKind,
    flag: ReflectFlagKind,
    items: ReflectItemsKind,
    range: ReflectClockKind,
    list: ReflectListKind,
};
