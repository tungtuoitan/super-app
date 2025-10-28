import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import './index.css';
import { App } from './App';
import { theme } from './config/theme';

/**
 * Application entry point.
 *
 * This file bootstraps the React application by:
 * - Creating the React root element
 * - Setting up the MUI theme provider with custom theme
 * - Adding CSS baseline for consistent styling across browsers
 * - Enabling React Strict Mode for development checks
 * - Rendering the main App component
 */

// Enable dark mode for ClickUp theme
document.documentElement.classList.add('dark');

// Get the root DOM element and create React root
const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

// Render the application with all necessary providers
root.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>
);
