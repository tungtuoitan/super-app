import { MouseEvent, useEffect, useState } from "react";
import { constants } from "@/utils/constants";
import { envConfig } from "@/utils/config/env.config";
import { useMobileStore } from "@/shared/store/Mobile.store";
import { CommandPalette } from "@/shared/components/CommandPalette";
import {useActivityBarStore} from "@/shell/store/ActivityBar.store";
import {useCommandPaletteStore} from "@/shell/store/useCommandPalette.store";

/**
 * Top navigation component.
 *
 * This component renders the application's top navigation bar, providing
 * navigation elements and user interaction features. It includes:
 * - App bar with sticky positioning for consistent visibility
 * - Integration with authentication context for user-specific features
 * - Snackbar notifications for user feedback
 *
 * Currently in development with placeholder content ('xxx').
 *
 * @returns The top navigation component
 */
export function TopNav() {
    const showDevBadge = envConfig.REACT_APP_ENVIRONMENT?.toLowerCase() !== constants.environments.production.toLowerCase();
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { isMobile } = useMobileStore();
    const { setIsOpen } = useCommandPaletteStore();

    // Handle Ctrl+P to open command palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleToggleSidebar = () => {
        // logger.log("Toggle Sidebar Clicked", {
        //     currentIsSideBarVisible: isSideBarVisible,
        //     newIsSideBarVisible: !isSideBarVisible,
        //     isMobile,
        // });

        setIsSideBarVisible(!isSideBarVisible);

        // Check position after toggle
        setTimeout(() => {
            const topNavElement = document.querySelector(".top-navigation") as HTMLElement;
            if (topNavElement) {
                const rect = topNavElement.getBoundingClientRect();
                // logger.log("TopNav Position After Toggle", {
                //     top: rect.top,
                //     bottom: rect.bottom,
                //     height: rect.height,
                //     isVisible: rect.top >= 0 && rect.top < window.innerHeight,
                //     scrollY: window.scrollY,
                //     pageYOffset: window.pageYOffset,
                // });
            }
        }, 100);
    };

    return (
        <>
            <CommandPalette />

            <div className="top-navigation w-full bg-black h-[36px] sticky top-0 z-50">
                <nav className="bg-[#1B1D23] h-[36px] flex items-center px-4 gap-2 w-full">
                    {/* Left side - Logo */}
                    <div className=" flex items-center">
                        <img src="/logo-32x32-web.png" alt="Logo" className="w-4 h-4 mr-1 rounded-sm filter invert" />
                        <span className="text-white text-[10px] text-white/80 uppercase tracking-wide">S  u  p  e  r   A  p  p</span>
                    </div>

                    {/* Mobile sidebar toggle button */}
                    {isMobile && (
                        <button
                            onClick={handleToggleSidebar}
                            className="p-1 rounded text-gray-300 transition-colors"
                            title={isSideBarVisible ? "Hide sidebar" : "Show sidebar"}
                            aria-label={isSideBarVisible ? "Hide sidebar" : "Show sidebar"}
                        >
                            {isSideBarVisible ? (
                                /* Close (X) icon when sidebar is visible */
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            ) : (
                                /* Hamburger menu icon when sidebar is hidden */
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            )}
                        </button>
                    )}

                    {/* <DevDetail /> */}

                    {/* Spacer to push content to right */}
                    <div className="flex-1"></div>

                    {/* Right side - DEV badge */}
                    {showDevBadge && <div className="text-red-500 font-bold text-sm uppercase">DEV</div>}
                </nav>
            </div>
        </>
    );
}
