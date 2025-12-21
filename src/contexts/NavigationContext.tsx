/**
 * Navigation Context
 * Global navigation state management for sidebar navigation, body wrapper, 
 * routing, and selected menu items across the application
 */

import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { ROUTE_TO_VIEW, VIEW_TO_ROUTE, type ActivityBarView } from '@/config/routes';
import { constants } from '@/utils/constants';

/**
 * Navigation context interface defining the shape of navigation state and actions
 */
export interface NavigationContextValue {
    sideNavigationRef: React.MutableRefObject<HTMLDivElement | null>;
    bodyWrapperRef: React.MutableRefObject<HTMLDivElement | null>;
    expanded: boolean;
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    toggleNavigation: () => void;
    selectedItemId: string | null;
    setSelectedItemId: (id: string) => void;
    activeView: ActivityBarView;
    navigateToView: (view: ActivityBarView) => void;
}

export const NAVIGATION_CONTEXT_DEFAULT_VALUE: NavigationContextValue = {
    sideNavigationRef: { current: null },
    bodyWrapperRef: { current: null },
    expanded: false,
    setExpanded: () => {},
    toggleNavigation: () => {},
    selectedItemId: null,
    setSelectedItemId: () => {},
    activeView: constants.viewTypes.workspace,
    navigateToView: () => {},
};

const NavigationContext = createContext<NavigationContextValue>(
    NAVIGATION_CONTEXT_DEFAULT_VALUE
);

/**
 * Custom hook to access navigation context
 * @throws {Error} When used outside of NavProvider
 * @returns {NavigationContextValue} Navigation context value with state and actions
 */
export const useNavigationStore = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigationStore must be used within NavProvider');
    }
    return context;
};

/**
 * Navigation provider component that manages navigation state for the entire application
 * Provides sidebar expansion state, navigation references, routing integration,
 * and selected menu item tracking
 */
export const NavProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const sideNavigationRef = useRef<HTMLDivElement | null>(null);
    const bodyWrapperRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState<boolean>(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<ActivityBarView>(constants.viewTypes.workspace);
    
    const location = useLocation();
    const navigate = useNavigate();

    // Sync activeView with current route
    useEffect(() => {
        const view = ROUTE_TO_VIEW[location.pathname];
        if (view && view !== activeView) {
            setActiveView(view);
        }
    }, [location.pathname]);

    const toggleNavigation = () => {
        setExpanded((prev) => !prev);
    };

    const navigateToView = (view: ActivityBarView) => {
        const route = VIEW_TO_ROUTE[view];
        if (route && location.pathname !== route) {
            navigate(route);
        }
    };

    return (
        <NavigationContext.Provider
            value={{
                sideNavigationRef,
                bodyWrapperRef,
                expanded,
                setExpanded,
                toggleNavigation,
                selectedItemId,
                setSelectedItemId,
                activeView,
                navigateToView,
            }}
        >
            {children}
        </NavigationContext.Provider>
    );
};
