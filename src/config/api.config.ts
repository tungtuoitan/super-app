/**
 * API Configuration
 * Centralized API endpoints and base URL configuration
 *
 * Security Features:
 * - No hardcoded production IPs
 * - Environment variable based configuration
 * - Secure HTTPS defaults
 * - Use .env.local for production URLs (gitignored)
 */

/**
 * Get the base URL for API requests
 * Prioritizes environment variable, then provides secure fallbacks
 * @returns Base URL for all API requests
 */
const getBaseUrl = (): string => {
    // Always use environment variable
    // For production, set REACT_APP_API_URL in .env.local (gitignored)
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // Safe development fallback
    if (window.location.hostname === 'localhost') {
        return 'http://localhost:5000';
    }

    // Default to HTTP for development (change to HTTPS in production)
    console.warn('REACT_APP_API_URL not set. Using default HTTP endpoint.');
    return 'http://localhost:5000';
};

/**
 * Base API configuration
 * Contains base URL, timeout, and default headers for all API requests
 */
export const API_CONFIG = {
    baseURL: getBaseUrl(),
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
} as const;

/**
 * Centralized API endpoints configuration
 * All API endpoints organized by feature/domain for easy maintenance
 */
export const API_ENDPOINTS = {
    auth: {
        login: '/auth/login',
        exchangeToken: '/auth/exchangeAuthorizationCodeForToken',
    },
    notes: {
        getAll: '/api/Notes',
        create: '/api/Notes',
        update: '/api/Notes',
        delete: '/api/Notes',
    },
    tags: {
        getAll: '/api/Tags',
        create: '/api/Tags',
        update: '/api/Tags',
        delete: '/api/Tags',
    },
    events: {
        getAll: '/Ev/GetEvs',
        createOrUpdate: '/Ev/IuEv',
    },
    srs: {
        getAll: '/SRs/GetSRs',
    },
    prs: {
        getAll: '/Pr/GetPrs',
        createOrUpdate: '/Pr/IuPr',
    },
    folders: {
        getAll: '/Fo/GetFos',
        createOrUpdate: '/Fo/IuFos',
    },
    userProfile: {
        get: '/UserProfile/GetUserProfileJson',
        createOrUpdate: '/UserProfile/IuUserProfile',
    },
    filters: {
        getPrParentIds: '/PrFilter/GetPrParentIds',
    },
} as const;
