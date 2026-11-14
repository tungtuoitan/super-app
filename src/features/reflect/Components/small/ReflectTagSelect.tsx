/** ReflectTagSelect — narrows the table to one kind of entry (the tags the nightly scan gave to the rows) */

import { reflectConstants } from "../../reflect.constants";
import { useReflectRows } from "../../Selectors/useReflect.selector";
import { useReflectTagFilter, useReflectViewActions } from "../../Selectors/useReflectView.selector";
import { reflectTagOptions } from "../../utils/reflect.utils";

export function ReflectTagSelect() {
    const tag = useReflectTagFilter();
    const { tagChanged } = useReflectViewActions();
    const options = reflectTagOptions(useReflectRows());

    return (
        <select value={tag} onChange={(e) => tagChanged(e.target.value)} aria-label={reflectConstants.allTagsLabel} className={reflectConstants.tagSelectClass}>
            <option value="">{reflectConstants.allTagsLabel}</option>
            {options.map((t) => (
                <option key={t} value={t}>
                    {reflectConstants.tagLabels[t] ?? t}
                </option>
            ))}
        </select>
    );
}
