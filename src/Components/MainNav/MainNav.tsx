import { Route, Routes } from 'react-router-dom';
import { Box } from '@mui/material';

import { useNavigationStore } from '../../contexts/NavigationContext';
import { TopNav } from '../TopNav';
import { TagsPage } from '../../pages/TagsPage';
import { FlexibleLayoutDemo } from '../../pages/FlexibleLayoutDemo';
import { VSCodeLayout } from '../Layout/NotesLayout';
import { BodyWrapper, SideNavRoot } from './SideMenuItem.styles';

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
        <Box
            sx={{ outline: 'none' }}
            tabIndex={0} // Enable keyboard navigation
        >
            <TopNav />
            <SideNavRoot className="side-tabs">
                <BodyWrapper 
                    id="bodyWrapper"
                    ref={bodyWrapperRef}
                    sx={{
                        width: '100%',
                        height: 'calc(100vh - 64px)', // Account for TopNav height
                    }}
                >
                    <Routes>
                        <Route path="/" element={<VSCodeLayout />} />
                        <Route path="/tags" Component={TagsPage} />
                        <Route path="/notes" element={<VSCodeLayout />} />
                    </Routes>
                </BodyWrapper>
            </SideNavRoot>
        </Box>
    );
}

export default MainNav;