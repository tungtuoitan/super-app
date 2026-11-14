/** A strip of days, lit when the thing happened that day (went running, ...) */

import { cn } from "@/lib/utils";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { reflectFlagDays } from "../../utils/reflect.utils";

export function ReflectFlagKind({ series }: ReflectChartKindProps) {
    return (
        <div className={reflectConstants.flagWrapClass}>
            {reflectFlagDays(series).map((d) => (
                <div key={d.date} title={d.date} className={cn(reflectConstants.flagCellClass, d.on ? reflectConstants.flagOnClass : reflectConstants.flagOffClass)} />
            ))}
        </div>
    );
}
