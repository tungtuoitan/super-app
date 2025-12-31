import { Route, Routes, Navigate } from "react-router-dom";

import { useNavigationStore } from "../../contexts/NavigationContext";
import { TopNav } from "../TopNav";
import { VSCodeLayout } from "../VSCodeLayout";
import { AuthCallback } from "@/pages/AuthCallback";
import { constants } from "@/utils/index";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { NavigationKeyboardShortcuts } from "@/Components/VSCodeLayout/NavigationKeyboardShortcuts";

/**
 * Main navigation component.
 *
 * This component provides the primary navigation structure for the application,
 * including:
 * - Top navigation bar
 * - Main content area with routing
 * - VSCode-style layout with integrated sidebar
 *
 * Routes:
 * - /explorer: Explorer view (folder tree)
 * - /workspace: Workspace view
 * - /notes: Notes list view
 * - /: Redirects to /explorer
 *
 * @returns The main navigation layout component
 */
export default function MainNav() {
    const { bodyWrapperRef } = useNavigationStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const handleGlobalRightClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Always disable default context menu
        // Always open context menu - let child components override with their own
        showContextMenu(e, "default");
    };

    return (
        <div
            className="overflow-hidden h-full w-full m-0 p-0"
            onContextMenu={handleGlobalRightClick} // Global right-click handler
        >
            {/* Global navigation keyboard shortcuts (Alt + Arrow) */}
            <NavigationKeyboardShortcuts />
            
            <div
                className="outline-none"
                tabIndex={0} // Enable keyboard navigation
                style={{ height: "100%", width: "100vw" }}
            >
                <TopNav />
                <div className="side-tabs height-[calc(100%-36px)]">
                    <div id="bodyWrapper" ref={bodyWrapperRef} className="w-full h-[calc(100vh-36px)]">
                        <Routes>
                            <Route path={constants.navigation.path.home} element={<Navigate to={constants.navigation.path.workspace} replace />} />
                            <Route path={constants.navigation.path.ws} element={<VSCodeLayout />} />
                            <Route path={constants.navigation.path.workspace} element={<VSCodeLayout />} />
                            <Route path={constants.navigation.path.notes} element={<VSCodeLayout />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
}
