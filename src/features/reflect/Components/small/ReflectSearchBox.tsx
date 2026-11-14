/** ReflectSearchBox — the search input of the journal header; Ctrl+F focuses it while it is on screen */

import { useRef } from "react";
import { Search } from "lucide-react";
import { reflectConstants } from "../../reflect.constants";
import { useReflectSearchShortcutHeadless } from "../../hooks/useReflectSearchShortcut.headless";
import { useReflectSearchText, useReflectViewActions } from "../../Selectors/useReflectView.selector";

export function ReflectSearchBox() {
    const inputRef = useRef<HTMLInputElement>(null);
    const searchText = useReflectSearchText();
    const { searchChanged } = useReflectViewActions();
    useReflectSearchShortcutHeadless(inputRef);

    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
                ref={inputRef}
                value={searchText}
                onChange={(e) => searchChanged(e.target.value)}
                placeholder={reflectConstants.searchPlaceholder}
                aria-label={reflectConstants.searchLabel}
                className={reflectConstants.searchInputClass}
            />
        </div>
    );
}
