/**
 * Environment Variables Configuration
 * All environment variables are centralized here for easy management and validation
 */

import { constants } from "../utils";

export const envConfig = {
    // Environment
    REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
    NODE_ENV: process.env.NODE_ENV,

    // API
    REACT_APP_LOCAL_API_URL: process.env.REACT_APP_LOCAL_API_URL,

    // Features
    REACT_APP_ENABLE_LOGGING: process.env.REACT_APP_ENABLE_LOGGING,
    REACT_APP_ENABLE_DARK_MODE: process.env.REACT_APP_ENABLE_DARK_MODE,

    // Google OAuth
    REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    REACT_APP_GOOGLE_REDIRECT_URI: process.env.REACT_APP_GOOGLE_REDIRECT_URI,

    // Groq
    REACT_APP_GROQ_API_KEY: process.env.REACT_APP_GROQ_API_KEY,
} as const;

/**
 * Validate environment configuration
 * Checks if all required environment variables are present and logs the status
 */
export function validateEnvironmentConfig(): {
    isValid: boolean;
    missing: string[];
    warnings: string[];
} {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Required variables
    const required = ["NODE_ENV", "REACT_APP_ENVIRONMENT", "REACT_APP_GOOGLE_CLIENT_ID", "REACT_APP_GOOGLE_REDIRECT_URI"];

    // Recommended variables for production
    const recommended = ["REACT_APP_LOCAL_API_URL"];

    // Check required variables
    required.forEach((key) => {
        if (!envConfig[key as keyof typeof envConfig]) {
            missing.push(key);
        }
    });

    // Check recommended variables
    recommended.forEach((key) => {
        if (!envConfig[key as keyof typeof envConfig]) {
            warnings.push(`${key} is not set (recommended for full functionality)`);
        }
    });

    return {
        isValid: missing.length === 0,
        missing,
        warnings,
    };
}
