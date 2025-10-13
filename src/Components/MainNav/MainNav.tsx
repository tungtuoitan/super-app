import { Route, Routes } from 'react-router-dom';
import { Box } from '@mui/material';

import { useNavigationStore } from '../../contexts/NavigationContext';
import { TopNav } from '../TopNav';
import { NotesPage } from '../../pages/NotesPage';
import { TagsPage } from '../../pages/TagsPage';
import { SideMenu } from './SideMenu';
import { BodyWrapper, SideNavRoot } from './SideMenuItem.styles';

/**
 * Main navigation component.
 * 
 * This component provides the primary navigation structure for the application,
 * including:
 * - Top navigation bar
 * - Collapsible side navigation menu
 * - Main content area with routing
 * - Responsive layout that adjusts based on sidebar expansion state
 * 
 * The component manages the layout between the sidebar and main content area,
 * dynamically adjusting widths based on the navigation expansion state.
 * 
 * @returns The main navigation layout component
 */
function MainNav() {
    const { bodyWrapperRef, expanded } = useNavigationStore();

    return (
        <Box
            sx={{ outline: 'none' }}
            tabIndex={0} // Enable keyboard navigation
        >
            <TopNav />
            <SideNavRoot className="side-tabs">
                <SideMenu />
                <BodyWrapper 
                    id="bodyWrapper"
                    ref={bodyWrapperRef}
                    sx={{
                        width: expanded ? 'calc(100% - 200px)' : 'calc(100% - 48px)',
                    }}
                >
                    <Routes>
                        <Route path="/" Component={NotesPage} />
                        <Route path="/tags" Component={TagsPage} />
                        <Route path="/notes" Component={NotesPage} />
                    </Routes>
                </BodyWrapper>
            </SideNavRoot>
        </Box>
    );
}

export default MainNav;