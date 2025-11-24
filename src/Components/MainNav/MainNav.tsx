import { Route, Routes } from 'react-router-dom';

import { useNavigationStore } from '../../contexts/NavigationContext';
import { TopNav } from '../TopNav';
import { TagsPage } from '../../pages/TagsPage';
import { VSCodeLayout } from '../notes/NotesLayout';
import { ShadcnTestPage } from '../../pages/ShadcnTestPage';

/**
 * Main navigation component.
 * 
 * This component provides the primary navigation structure for the application,
 * including:
 * - Top navigation bar
 * - Main content area with routing
 * - VSCode-style layout with integrated sidebar
 * 
 * The sidebar (Explorer, Tags, Notes) is now integrated into the VSCodeLayout
 * component, removing the need for a separate side menu.
 * 
 * @returns The main navigation layout component
 */
function MainNav() {
    const { bodyWrapperRef } = useNavigationStore();

    return (
        <div
            className="outline-none"
            tabIndex={0} // Enable keyboard navigation
        >
            <TopNav />
            <div className="side-tabs">
                <div 
                    id="bodyWrapper"
                    ref={bodyWrapperRef}
                    className="w-full h-[calc(100vh-64px)]"
                >
                    <Routes>
                        <Route path="/" element={<VSCodeLayout />} />
                        <Route path="/tags" Component={TagsPage} />
                        <Route path="/notes" element={<VSCodeLayout />} />
                        <Route path="/test" element={<ShadcnTestPage />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

export default MainNav;