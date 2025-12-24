/**
 * Environment Variables Configuration
 * All environment variables are centralized here for easy management and validation
 */

export const envConfig = {
    // Environment
    ENVIRONMENT: process.env.ENVIRONMENT,
    NODE_ENV: process.env.NODE_ENV,

    // API
    REACT_APP_LOCAL_API_URL: process.env.REACT_APP_LOCAL_API_URL,

    // Features
    REACT_APP_ENABLE_LOGGING: process.env.REACT_APP_ENABLE_LOGGING,
    REACT_APP_ENABLE_DARK_MODE: process.env.REACT_APP_ENABLE_DARK_MODE,

    // Google OAuth
    REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    REACT_APP_GOOGLE_REDIRECT_URI: process.env.REACT_APP_GOOGLE_REDIRECT_URI,
} as const;
