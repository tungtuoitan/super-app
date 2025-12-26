/**
 * Styled components for side navigation menu items.
 *
 * This module contains all styled components used in the side navigation
 * system, including:
 * - Main navigation root container
 * - Menu item wrappers and links
 * - Expansion and collapse animations
 * - Hover and active state styling
 *
 * The styles implement a collapsible sidebar with smooth transitions
 * and consistent theming throughout the navigation interface.
 *
 * MIGRATION NOTE: Converted from MUI styled() to Tailwind CSS class strings.
 * These are exported as const strings that can be used directly in className props.
 * NOTE: This file appears to be unused in the current codebase but kept for reference.
 */

// SideNavRoot - Main navigation root container
export const sideNavRootClasses = "flex-grow bg-[#f6f6f6] h-[calc(100vh-64px)] flex flex-row";

// BodyWrapper - Main content wrapper
export const bodyWrapperClasses = "flex flex-grow w-[calc(100%-48px)] h-[calc(100vh-64px)]";

// Wink - Styled navigation link with hover states
export const winkClasses =
    "flex w-full flex-row items-center relative flex-grow py-0.5 px-2.5 h-auto min-h-[36px] text-white no-underline rounded transition-colors duration-200 hover:bg-black/30 active:bg-black/30";

// MenuItemWrapper - Container for menu items
export const menuItemWrapperClasses = "flex-shrink-0 flex flex-col relative items-start w-full";

// PopupMenuItemWrapper - Container for popup menu items
export const popupMenuItemWrapperClasses = "flex-shrink-0 relative flex flex-col items-start";

// MenuItemLine - Line container for menu items
export const menuItemLineClasses = "items-center flex w-full flex-row";

// IconWrapper - Container for menu item icons
export const iconWrapperClasses = "min-w-[24px] w-6 h-6 text-white flex flex-row items-center justify-center";

// ItemLink - Link styling for menu items
export const itemLinkClasses = "flex flex-row items-center relative flex-grow m-0 px-3 text-white";

// ItemLabel - Label text for menu items
export const itemLabelClasses = "text-white text-[0.95rem] flex-grow items-center flex flex-row pl-3 font-normal no-underline whitespace-nowrap overflow-hidden text-ellipsis";

// SideMenuWrapper - Main sidebar container with transition
// Add 'w-[200px]' for expanded or 'w-12' for collapsed state
export const sideMenuWrapperClasses = "flex flex-col h-full bg-[#36454f] relative transition-all duration-[400ms]";
export const sideMenuWrapperExpanded = "w-[200px]";
export const sideMenuWrapperCollapsed = "w-12";

// SideNavigationWrapper - Navigation wrapper with transitions
export const sideNavigationWrapperClasses = "transition-all duration-[400ms] flex-grow flex flex-col relative h-full";

// NavigationList - List container for navigation items
export const navigationListClasses = "flex-grow flex-col flex pt-2.5";

// Expander - Sidebar expansion control
export const expanderClasses = "p-2.5 relative text-white flex justify-end items-center w-full mt-auto z-10 pointer-events-auto flex-row";

// ExpanderArrow - Arrow button for expansion control
export const expanderArrowClasses = "flex items-center justify-center p-1 rounded transition-colors duration-200 hover:bg-white/10";
