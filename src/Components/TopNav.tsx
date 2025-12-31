import { MouseEvent, useEffect } from "react";
import { useSnackbar } from "notistack";

import { useAuthStore } from "@/store/auth/Auth.store";
import { config } from "@/config/app.config";
import { constants } from "@/utils/constants";
import { envConfig } from "../config";
import { useNavigationHistoryStore } from "@/store/editor/NavigationHistory.store";

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
    const showDevBadge = envConfig.ENVIRONMENT !== constants.environments.production;

    return (
        <div className="top-navigation flex-grow bg-black h-[36px] z-[10000000000] sticky top-0">
            <nav className="bg-[#1B1D23] sticky top-0 h-[36px] flex items-center px-4 gap-2">
                {showDevBadge && <div className="text-red-500 font-bold text-sm uppercase">DEV</div>}
                    
                {/* <DevDetail /> */}

                <div className="flex-1">{/* Right side content can go here */}</div>
            </nav>
        </div>
    );
}




export function DevDetail() {
    const show = envConfig.ENVIRONMENT !== constants.environments.production;
    const { past, present, future } = useNavigationHistoryStore();
    if (!show) return null;

    return (
        <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-xs text-gray-400 mr-2">History:</span>

            {/* Past entries */}
            {past.map((entry, index) => (
                <div
                    key={`past-${entry.tabId}-${entry.timestamp}`}
                    className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-400 flex flex-col items-center"
                    title={`PAST - Tab: ${entry.tabId}, Type: ${entry.type}, Item: ${entry.itemId}, Time: ${new Date(entry.timestamp).toLocaleTimeString()}
Scroll: ${entry.scrollPositions?.map((s) => `${s.elementId}(${s.scrollTop},${s.scrollLeft})`).join(", ") || "none"}
Field: ${entry.focusedFieldId || "none"}`}
                >
                    <div>{entry.type}#{entry.itemId}</div>
                    <div className="text-[10px] opacity-75">
                        {entry.scrollPositions && entry.scrollPositions.length > 0 && `S${entry.scrollPositions.length}`}
                        {entry.focusedFieldId && ` F:${entry.focusedFieldId}`}
                    </div>
                </div>
            ))}

            {/* Present entry */}
            {present && (
                <div
                    className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white font-bold flex flex-col items-center"
                    title={`PRESENT - Tab: ${present.tabId}, Type: ${present.type}, Item: ${present.itemId}, Time: ${new Date(present.timestamp).toLocaleTimeString()}
Scroll: ${present.scrollPositions?.map((s) => `${s.elementId}(${s.scrollTop},${s.scrollLeft})`).join(", ") || "none"}
Field: ${present.focusedFieldId || "none"}`}
                >
                    <div>{present.type}#{present.itemId} ←</div>
                    <div className="text-[10px] opacity-90">
                        {present.scrollPositions && present.scrollPositions.length > 0 && `S${present.scrollPositions.length}`}
                        {present.focusedFieldId && ` F:${present.focusedFieldId}`}
                    </div>
                </div>
            )}

            {/* Future entries */}
            {future.map((entry, index) => (
                <div
                    key={`future-${entry.tabId}-${entry.timestamp}`}
                    className="px-2 py-0.5 text-xs rounded bg-gray-500 text-gray-500 flex flex-col items-center"
                    title={`FUTURE - Tab: ${entry.tabId}, Type: ${entry.type}, Item: ${entry.itemId}, Time: ${new Date(entry.timestamp).toLocaleTimeString()}
Scroll: ${entry.scrollPositions?.map((s) => `${s.elementId}(${s.scrollTop},${s.scrollLeft})`).join(", ") || "none"}
Field: ${entry.focusedFieldId || "none"}`}
                >
                    <div>{entry.type}#{entry.itemId}</div>
                    <div className="text-[10px] opacity-75">
                        {entry.scrollPositions && entry.scrollPositions.length > 0 && `S${entry.scrollPositions.length}`}
                        {entry.focusedFieldId && ` F:${entry.focusedFieldId}`}
                    </div>
                </div>
            ))}

            {!present && past.length === 0 && future.length === 0 && <span className="text-xs text-gray-500 italic">Empty</span>}
        </div>
    );
}
