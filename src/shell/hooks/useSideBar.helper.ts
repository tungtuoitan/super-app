/**
 * SideBar Helper — public API for features.
 * Features MUST use this instead of useSideBarStore directly.
 *
 * useSideBarHelper()  — reactive hook (inside React components)
 * getSideBarState()   — non-reactive snapshot (inside callbacks / module handlers)
 */

import {
    useSideBarStore,
    getSideBarState as _getSideBarState,
} from "../store/SideBar.store";

/** Reactive hook — subscribe to sidebar state inside React components. */
export const useSideBarHelper = () => {
    const { searchQuery, filterViewKey, moduleName, setModuleName } = useSideBarStore();
    return { searchQuery, filterViewKey, moduleName, setModuleName };
};

/** Non-reactive snapshot — read sidebar state inside callbacks outside React render. */
// export const getSideBarState = () => {
//     const { searchQuery, moduleName } = _getSideBarState();
//     return { searchQuery, moduleName };
// };
