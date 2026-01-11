import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import {
    Pin as PinIcon,
    PinOff as UnpinIcon,
    X as CloseIcon,
    XCircle as CloseAllIcon,
} from "lucide-react";
import { useTabBarMenuHelper } from "@/shared/contexts/helpers/useTabBarMenu.helper";

/**
 * TabBarMenu
 * Context menu for tabs in the tab bar
 *
 * Menu Items:
 * - Pin Tab / Unpin Tab
 * - Close All Tabs
 * - Close All But Pinned
 */
export function TabBarMenu() {
    const { contextTabId, isPinned, pinTab, unpinTab, closeAllSavedTabs, closeSavedTabsButPinned } = useTabBarMenuHelper();

    if (!contextTabId) return null;

    return (
        <>
            {/* Pin/Unpin */}
            {isPinned ? (
                <MenuItem onClick={unpinTab}>
                    <UnpinIcon className="w-4 h-4 mr-2" />
                    Unpin Tab
                </MenuItem>
            ) : (
                <MenuItem onClick={pinTab}>
                    <PinIcon className="w-4 h-4 mr-2" />
                    Pin Tab
                </MenuItem>
            )}

            <MenuDivider />

            {/* Close All */}
            <MenuItem onClick={closeAllSavedTabs}>
                <CloseAllIcon className="w-4 h-4 mr-2" />
                Close All Saved Tabs
            </MenuItem>

            {/* Close All But Pinned */}
            <MenuItem onClick={closeSavedTabsButPinned}>
                <CloseIcon className="w-4 h-4 mr-2" />
                Close All Saved Tabs But Pinned
            </MenuItem>
        </>
    );
}
