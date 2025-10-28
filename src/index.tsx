import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import './index.css';
import { App } from './App';
import { theme } from './config/theme';
import { ThemeProvider as CustomThemeProvider } from './contexts/ThemeContext';

/**
 * Application entry point.
 *
 * This file bootstraps the React application by:
 * - Creating the React root element
 * - Setting up theme providers (custom + MUI)
 * - Adding CSS baseline for consistent styling across browsers
 * - Enabling React Strict Mode for development checks
 * - Rendering the main App component
 *
 * Theme: Default is light mode, user can toggle via Settings dialog
 */

// Get the root DOM element and create React root
const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

// Render the application with all necessary providers
root.render(
    <React.StrictMode>
        <CustomThemeProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </CustomThemeProvider>
    </React.StrictMode>
);
