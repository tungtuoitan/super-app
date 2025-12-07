import { Route, Routes, Navigate } from 'react-router-dom';

import { useNavigationStore } from '../../contexts/NavigationContext';
import { TopNav } from '../TopNav';
import { VSCodeLayout } from '../VSCodeLayout';
import {useContextMenuHelper} from '@/hooks/useContextMenuHelper';
import { APP_ROUTES } from '@/config/routes';

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
    const { showContextMenu } = useContextMenuHelper();
    
        const handleGlobalRightClick = (e: React.MouseEvent) => {
            e.preventDefault(); // Always disable default context menu
            // Always open context menu - let child components override with their own
            showContextMenu(e, 'default');
        };

    return (
        <div
            className="overflow-hidden h-full w-full m-0 p-0"
            onContextMenu={handleGlobalRightClick} // Global right-click handler
        >
            <div
                className="outline-none"
                tabIndex={0} // Enable keyboard navigation
                style={{ height: '100%', width: '100vw' }}
            >
                <TopNav />
                <div className="side-tabs height-[calc(100%-36px)]">
                    <div 
                        id="bodyWrapper"
                        ref={bodyWrapperRef}
                        className="w-full h-[calc(100vh-36px)]"
                    >
                        <Routes>
                            <Route path={APP_ROUTES.HOME} element={<Navigate to={APP_ROUTES.WORKSPACE} replace />} />
                            <Route path={APP_ROUTES.WORKSPACE_LIST} element={<VSCodeLayout />} />
                            <Route path={APP_ROUTES.WORKSPACE} element={<VSCodeLayout />} />
                            <Route path={APP_ROUTES.NOTES} element={<VSCodeLayout />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
        

    );
}
