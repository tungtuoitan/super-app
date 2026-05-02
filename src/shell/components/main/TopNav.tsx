import { constants } from "@/shared";
import { envConfig } from "config/env.config";
import { useDeviceStore } from "@/shared";
import { CommandPalette } from "@/shell/commandPallete/CommandPalette";
import { useActivityBarStore } from "@/shell/store/ActivityBar.store";

/**
 * TopNav — application top bar.
 * Ctrl+P is handled by useCommandPaletteKeyDown inside <CommandPalette />.
 */
export function TopNav() {
    const showDevBadge = envConfig.REACT_APP_ENVIRONMENT?.toLowerCase() !== constants.environments.production.toLowerCase();
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { isMobile } = useDeviceStore();

    const handleToggleSidebar = () => {
        setIsSideBarVisible(!isSideBarVisible);
    };

    return (
        <>
            <CommandPalette />

            <div className="top-navigation w-full bg-black h-[36px] sticky top-0 z-50">
                <nav className="bg-[#1B1D23] h-[36px] flex items-center px-4 gap-2 w-full">
                    <div className="flex items-center">
                        <img src="/logo-32x32-web.png" alt="Logo" className="w-4 h-4 mr-1 rounded-sm filter invert" />
                        <span className="text-white text-[10px] text-white/80 uppercase tracking-wide">S  u  p  e  r   A  p  p</span>
                    </div>

                    {isMobile && (
                        <button
                            onClick={handleToggleSidebar}
                            className="p-1 rounded text-gray-300 transition-colors"
                            title={isSideBarVisible ? "Hide sidebar" : "Show sidebar"}
                            aria-label={isSideBarVisible ? "Hide sidebar" : "Show sidebar"}
                        >
                            {isSideBarVisible ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            )}
                        </button>
                    )}

                    <div className="flex-1"></div>
                    {showDevBadge && <div className="text-red-500 font-bold text-sm uppercase">DEV</div>}
                </nav>
            </div>
        </>
    );
}
