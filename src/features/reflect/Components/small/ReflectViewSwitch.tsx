/** ReflectViewSwitch — the Table / Charts buttons of the journal header */

import { cn } from "@/lib/utils";
import { reflectConstants } from "../../reflect.constants";
import { useReflectViewActions, useReflectViewName } from "../../Selectors/useReflectView.selector";

export function ReflectViewSwitch() {
    const view = useReflectViewName();
    const { viewChanged } = useReflectViewActions();

    return (
        <div className="flex items-center rounded-md border border-sa-border p-0.5">
            {reflectConstants.viewKeys.map((key) => (
                <button key={key} onClick={() => viewChanged(key)} className={cn(reflectConstants.viewButtonClass, view === key ? reflectConstants.viewButtonOnClass : reflectConstants.viewButtonOffClass)}>
                    {reflectConstants.views[key]}
                </button>
            ))}
        </div>
    );
}
