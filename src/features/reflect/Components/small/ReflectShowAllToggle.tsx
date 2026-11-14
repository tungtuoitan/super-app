/** ReflectShowAllToggle — switches the rows between "only the ones worth reading" and every row */

import { reflectConstants } from "../../reflect.constants";
import { useReflectShowAll, useReflectViewActions } from "../../Selectors/useReflectView.selector";

export function ReflectShowAllToggle({ hiddenCount }: { hiddenCount: number }) {
    const showAll = useReflectShowAll();
    const { showAllToggled } = useReflectViewActions();
    if (!showAll && hiddenCount === 0) return null;

    return (
        <button onClick={showAllToggled} className={reflectConstants.toggleButtonClass}>
            {showAll ? reflectConstants.showFewerLabel : reflectConstants.showAllLabel(hiddenCount)}
        </button>
    );
}
