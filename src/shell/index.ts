/**
 * Shell Feature Public API
 * Core app framework, editor, stores, and utilities.
 * Only import from this file when crossing feature boundaries.
 * Internal imports within shell should use relative paths.
 */


// ── Stores ────────────────────────────────────────────────────────────────
export { useEditorTabBarStore } from "./store/EditorTab.store";
// export { useActivityBarStore } from "./store/ActivityBar.store";
// export { useCommandPaletteStore } from "./commandPallete/useCommandPalette.store";
export { useSideBarStore, getSideBarState, subscribeSideBarState } from "./store/SideBar.store";


// ── Hooks ─────────────────────────────────────────────────────────────────
export { useEditorTabBarHelper } from "./hooks/useEditorTabBar.helper";
// export { useActivityBarHelper } from "./hooks/useActivityBar.helper";
export { useCommandPaletteHelper } from "./commandPallete/useCommandPalette.helper";
// export { useCommandPaletteKeyDown } from "./commandPallete/useCommandPaletteKeyDown";
// export { useTabBarHelper } from "./hooks/useTabBarHelper";
// export { useTabBarMenuHelper } from "./hooks/useTabBarMenu.helper";
// export { useEditorToolbarHelper } from "./hooks/useEditorToolbar.helper";
// export { useModuleRegisterHelper } from "./hooks/useGridAutoRegister.helper";
// export { useTabBarShortcuts } from "./hooks/useTabBarShortcuts";
export { useKeywordNavigationHelper } from "./commandPallete/useKeywordNavigation.helper";
export { findKeywordForNote, parseBreadcrumbFromKeyword, enrichBreadcrumbWithColors, buildBreadcrumbFromTree } from "./utils/breadcrumb.utils";



// ── Types ─────────────────────────────────────────────────────────────────
export type { BaseTab, TabViewState, TabType, MultiProjectTabData } from "./types/tab.types";
export type { ModuleDefinition, TabMeta, PanelTabDefinition, TabStorage, OpenTabsStorage, TabPersistence, ShortcutDefinition } from "./types/moduleRegistry.type";
export type { BreadcrumbItem } from "./utils/breadcrumb.utils";
export type { SaveActions } from "./types/actions.types";


// ── Module Registry ───────────────────────────────────────────────────────
export { moduleRegistry } from "./moduleRegistry";
export type { KeywordPlugin, NavigationContext } from "./commandPallete/keywordNavigator.registry";
// export { keywordNavigatorRegistry } from "./commandPallete/keywordNavigator.registry";
// export { AccountsDialog } from "./components/AccountsDialog";
// export { TabBarMenu } from "./components/TabBarMenu";


// ── Generic Filter ────────────────────────────────────────────────────────
export { filterRegistry } from "./genericFilter/filterRegistry";
export { filterUtils } from "./genericFilter/filter.utils";
export type { FilterDefinition } from "./genericFilter/filterRegistry";
export type { FilterValue, ViewFilter, UserFilters, FilterFieldConfig } from "./genericFilter/filter.types";
// export { useGenericFilterHelper } from "./genericFilter/useGenericFilterHelper";
// export { GenericFilterPopup } from "./genericFilter/GenericFilterPopup";



// ── Components ────────────────────────────────────────────────────────────
// export { KeywordIconRenderer } from "./commandPallete/KeywordIconRenderer";
// export { CommandPalette } from "./commandPallete/CommandPalette";
// export { ConfirmCloseDialog } from "./components/ConfirmCloseDialog";
// export { EditorToolbar } from "./components/main/EditorToolbar";
// export { ConfirmationPopoverContainer } from "../shared/confirmPopover/ConfirmationPopoverContainer";


export {shellConstants} from "./shell.constants";
export type { ActivityBarView } from "./types/activeBarView";
