import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { NavProvider } from './contexts/NavigationContext';
import { Main } from './Components/Main';
import { queryClient } from './lib/react-query';

import './App.css';

/**
 * Root application component.
 *
 * This component serves as the main entry point for the application,
 * setting up the global providers and the main layout structure.
 * It provides React Query for server state, navigation context,
 * and ensures the application fills the entire viewport.
 *
 * @returns The main application component with all necessary providers
 */
export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="App overflow-hidden h-screen w-full m-0 p-0">
                <NavProvider>
                    <Main />
                </NavProvider>
            </div>
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}
