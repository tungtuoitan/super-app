/**
 * SideBar Helper — public API for features.
 * Features MUST use this instead of useSideBarStore directly.
 */

import { useSideBarStore } from "../store/SideBar.store";

/** Reactive hook — subscribe to sidebar state inside React components. */
export const useSideBarHelper = () => {
    const { searchQuery, filterViewKey, moduleName, setModuleName } = useSideBarStore();
    return { searchQuery, filterViewKey, moduleName, setModuleName };
};
