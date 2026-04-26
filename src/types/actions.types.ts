import type { BaseTab } from "@/shell/types/tab.types";

/**
 * Contract for per-feature save handlers.
 * Each feature provides a hook returning this interface.
 * The shell coordinator (useEditorToolbarHelper) collects them and routes save requests.
 */
export interface SaveActions {
    /** Return true if this handler covers the given tab type */
    handles: (tabType: string) => boolean;
    /** Execute the save logic for this tab */
    onSave: (tab: BaseTab) => Promise<void>;
}
