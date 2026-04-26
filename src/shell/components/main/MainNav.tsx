import { Route, Routes, Navigate } from "react-router-dom";

import { useNavigationStore } from "../../../contexts/NavigationContext";
import { TopNav } from "./TopNav";
import { VSCodeLayout } from "@/shell/components";
import { AuthCallback } from "@/shell/components/AuthCallback";
import { constants } from "@/utils/index";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import {useMobileStore} from "@/shared/store/Mobile.store";

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
    const { isMobile } = useMobileStore();
    

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
            {/* <NavigationKeyboardShortcuts /> */}
            
            {/* Debug Panel for mobile debugging */}
            {/* <DebugPanel /> */}
            
            <div
                className="outline-none"
                tabIndex={0} // Enable keyboard navigation
                style={{ height: "100%", width: "100vw" }}
            >
                {isMobile ? null : <TopNav />}
                <div className={`side-tabs height-[100%]`}>
                    <div id="bodyWrapper" ref={bodyWrapperRef} className={`w-full ${isMobile ? 'h-screen': 'h-[calc(100vh-36px)]'}`}>
                        <Routes>
                            {/* <Route path={constants.navigation.path.home} element={<Navigate to={constants.navigation.path.home} replace />} /> */}
                            <Route path={constants.navigation.path.home} element={<VSCodeLayout />} />
                            {/* <Route path={constants.navigation.path.ws} element={<VSCodeLayout />} />
                            <Route path={constants.navigation.path.workspace} element={<VSCodeLayout />} />
                            <Route path={constants.navigation.path.k} element={<VSCodeLayout />} />
                            <Route path="/Kworkspace" element={<Navigate to={constants.navigation.path.k} replace />} />
                            <Route path={constants.navigation.path.notes} element={<VSCodeLayout />} />
                            <Route path={constants.navigation.path.project} element={<VSCodeLayout />} />
                            <Route path={constants.navigation.path.lifeLog} element={<VSCodeLayout />} /> */}
                            <Route path="/auth/callback" element={<AuthCallback />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
}
