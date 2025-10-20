import { Route, Routes } from 'react-router-dom';
import { Box } from '@mui/material';

import { useNavigationStore } from '../../contexts/NavigationContext';
import { TopNav } from '../TopNav';
import { TagsPage } from '../../pages/TagsPage';
import { FlexibleLayoutDemo } from '../../pages/FlexibleLayoutDemo';
import { FlexibleLayout } from '../Layout/FlexibleLayout';
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
                        height: 'calc(100vh - 64px)', // Account for TopNav height
                    }}
                >
                    <Routes>
                        <Route path="/" element={<FlexibleLayout />} />
                        <Route path="/tags" Component={TagsPage} />
                        <Route path="/notes" element={<FlexibleLayout />} />
                        <Route path="/demo" element={<FlexibleLayoutDemo />} />
                    </Routes>
                </BodyWrapper>
            </SideNavRoot>
        </Box>
    );
}

export default MainNav;