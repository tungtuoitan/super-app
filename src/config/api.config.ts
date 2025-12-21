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
    if (process.env.ENVIRONMENT === 'production' && process.env.PRO_API_URL) {
        return process.env.PRO_API_URL;
    } else {
        return process.env.LOCAL_API_URL || 'http://localhost:5000';
    }
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
    userProfile: {
        get: '/UserProfile/GetUserProfileJson',
        createOrUpdate: '/UserProfile/IuUserProfile',
    },
    filters: {
        getPrParentIds: '/PrFilter/GetPrParentIds',
    },
} as const;
