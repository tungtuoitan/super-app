/**
 * Shell Feature Public API
 * Core app framework, editor, stores, and utilities.
 * Only import from this file when crossing feature boundaries.
 * Internal imports within shell should use relative paths.
 */


// ── Stores ────────────────────────────────────────────────────────────────
export { useEditorTabBarStore } from "./store/EditorTab.store";
export { useActivityBarStore } from "./store/ActivityBar.store";
export { useCommandPaletteStore } from "./commandPallete/useCommandPalette.store";
export { useSideBarStore } from "./store/SideBar.store";


// ── Hooks ─────────────────────────────────────────────────────────────────
export { useEditorTabHelper } from "./hooks/useEditorTab.helper";
export { useActivityBarHelper } from "./hooks/useActivityBar.helper";
export { useCommandPaletteHelper } from "./commandPallete/useCommandPalette.helper";
// export { useCommandPaletteKeyDown } from "./commandPallete/useCommandPaletteKeyDown";
export { useTabBarHelper } from "./hooks/useTabBarHelper";
// export { useTabBarMenuHelper } from "./hooks/useTabBarMenu.helper";
export { useEditorToolbarHelper } from "./hooks/useEditorToolbar.helper";
export { useGridAutoRegisterHelper } from "./hooks/useGridAutoRegister.helper";
export { useTabBarShortcuts } from "./hooks/useTabBarShortcuts";
export { findNoteByEntityId, useKeywordNavigationHelper } from "./commandPallete/useKeywordNavigation.helper";
export { findKeywordForNote, parseBreadcrumbFromKeyword, enrichBreadcrumbWithColors, buildBreadcrumbFromTree } from "./utils/breadcrumb.utils";
export { transformWs } from "./utils/ws.utils";




// ── Types ─────────────────────────────────────────────────────────────────
export type { BaseTab, TabViewState, TabType, MultiProjectTabData } from "./types/tab.types";
export type { ModuleDefinition, TabMeta, PanelTabDefinition } from "./moduleRegistry";
export type { BreadcrumbItem } from "./utils/breadcrumb.utils";
export type { SaveActions } from "./types/actions.types";


// ── Module Registry ───────────────────────────────────────────────────────
export { moduleRegistry } from "./moduleRegistry";
// export { keywordNavigatorRegistry } from "./commandPallete/keywordNavigator.registry";
export type { KeywordPlugin, NavigationContext } from "./commandPallete/keywordNavigator.registry";
// export { AccountsDialog } from "./components/AccountsDialog";
// export { TabBarMenu } from "./components/TabBarMenu";


// ── Generic Filter ────────────────────────────────────────────────────────
export { filterRegistry } from "./genericFilter/filterRegistry";
export type { FilterDefinition } from "./genericFilter/filterRegistry";

// export { useGenericFilterHelper } from "./genericFilter/useGenericFilterHelper";
// export { GenericFilterPopup } from "./genericFilter/GenericFilterPopup";
export { filterUtils } from "./genericFilter/filter.utils";
export type { FilterValue, ViewFilter, UserFilters, FilterFieldConfig } from "./genericFilter/filter.types";



// ── Components ────────────────────────────────────────────────────────────
export { Main } from "../Main";
export { KeywordIconRenderer } from "./commandPallete/KeywordIconRenderer";
// export { CommandPalette } from "./commandPallete/CommandPalette";
// export { ConfirmCloseDialog } from "./components/ConfirmCloseDialog";
// export { EditorToolbar } from "./components/main/EditorToolbar";
// export { ConfirmationPopoverContainer } from "../shared/confirmPopover/ConfirmationPopoverContainer";


export {shellConstants} from "./shell.constants";