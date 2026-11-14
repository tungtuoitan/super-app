/** One row per item (e.g. each suggestion sentence), one column per day; a cell is lit when it happened that day */

import { cn } from "@/lib/utils";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { reflectItemCounts } from "../../utils/reflect.utils";

export function ReflectItemsKind({ series }: ReflectChartKindProps) {
    const { days, items } = reflectItemCounts(series);
    const columns = `10rem repeat(${days.length}, ${reflectConstants.itemGridMinColWidth})`;

    return (
        <div className="overflow-x-auto">
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: columns }}>
                {items.map((row) => (
                    <div key={row.item} className="contents">
                        <div className={reflectConstants.itemLabelClass} title={`${row.item} (${row.total})`}>
                            {row.item}
                        </div>
                        {days.map((day) => (
                            <div key={day} title={`${day}: ${row.counts[day] ?? 0}`} className={cn(reflectConstants.flagCellClass, row.counts[day] ? reflectConstants.itemCellOnClass : reflectConstants.itemCellOffClass)} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
