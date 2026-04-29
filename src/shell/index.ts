/**
 * Shell Feature Public API
 * Core app framework, editor, stores, and utilities.
 * Only import from this file when crossing feature boundaries.
 * Internal imports within shell should use relative paths.
 */

// ── Stores ────────────────────────────────────────────────────────────────
export { useEditorTabBarStore } from "./store/EditorTab.store";
export { useAuthStore } from "./store/Auth.store";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { useEditorTabHelper } from "./hooks/useEditorTab.helper";
export { useActivityBarHelper } from "./hooks/useActivityBar.helper";
export { useCommandPaletteHelper } from "./hooks/useCommandPalette.helper";
export { useTabBarHelper } from "./hooks/useTabBarHelper";
export { useConsoleHelper } from "./hooks/useConsole.helper";
export { useCheckIsMobile } from "./hooks/useCheckIsMobile";
export { useEditorToolbarHelper } from "./hooks/useEditorToolbar.helper";
export { useGridAutoRegisterHelper } from "./hooks/useGridAutoRegister.helper";
export { useDebugLog } from "./hooks/useDebugLog";

// ── Types ─────────────────────────────────────────────────────────────────
export type { BaseTab, TabViewState } from "./types/tab.types";

// ── Components ────────────────────────────────────────────────────────────
export { Main } from "./Main";
