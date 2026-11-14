/** Ctrl+F searches the journal instead of the browser page (only while the search box is on screen) */

import { useEffect } from "react";
import type { RefObject } from "react";

export const useReflectSearchShortcutHeadless = (inputRef: RefObject<HTMLInputElement>) => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const input = inputRef.current;
            if (!input || input.offsetParent === null) return;
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                input.focus();
                input.select();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [inputRef]);
};
