/** Day by day, newest first, with the words each point was read from: for things that have no number to draw */

import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";

export function ReflectListKind({ series }: ReflectChartKindProps) {
    return (
        <div>
            {[...series.points].reverse().map((p, i) => (
                <div key={`${p.date}-${i}`} className={reflectConstants.listRowClass}>
                    <span className={reflectConstants.listDateClass}>{p.date.slice(5)}</span>
                    <span className="text-foreground">{p.text ?? p.value ?? ""}</span>
                    {p.quote && p.quote !== p.text && <span className={reflectConstants.listQuoteClass}>{p.quote}</span>}
                </div>
            ))}
        </div>
    );
}
