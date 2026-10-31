import { useRef } from "react";
import { useGlobalShortcut } from "@/shared";

/**
 * Keyboard shortcuts of the project Reflect tab:
 * Ctrl+S saves the rows when only they have unsaved changes (otherwise the toolbar Save keeps Ctrl+S),
 * Esc discards them.
 */
export function useProjectReflectHeadless({ isDirty, hasProjectChanges, save, discard }: { isDirty: boolean; hasProjectChanges: boolean; save: () => Promise<void>; discard: () => void }) {
    const latestRef = useRef({ save, discard });
    latestRef.current = { save, discard };

    useGlobalShortcut("ctrl+s", { id: "project-reflect-save", priority: 100, enabled: isDirty && !hasProjectChanges }, () => { latestRef.current.save(); });
    useGlobalShortcut("escape", { id: "project-reflect-discard", priority: 50, enabled: isDirty }, () => { latestRef.current.discard(); });
}
