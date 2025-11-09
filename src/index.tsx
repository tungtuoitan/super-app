import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { applyShadcnTheme } from './lib/theme/shadcn';

import './index.css';

/**
 * Application entry point.
 *
 * This file bootstraps the React application by:
 * - Creating the React root element
 * - Setting up theme providers
 * - Initializing shadcn CSS variables
 * - Enabling React Strict Mode for development checks
 * - Rendering the main App component
 *
 * Theme: Default is light mode, user can toggle via Settings dialog
 */

// Get the root DOM element and create React root
const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

// Initialize shadcn CSS variables
applyShadcnTheme(document.documentElement);

// Render the application with all necessary providers
root.render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>
);
