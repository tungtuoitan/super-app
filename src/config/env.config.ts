/**
 * Environment Variables Configuration
 * All environment variables are centralized here for easy management and validation
 */

import {constants} from "../utils";

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
    const required = [
        "NODE_ENV", 
        "ENVIRONMENT", 
        "REACT_APP_GOOGLE_CLIENT_ID",
        "REACT_APP_GOOGLE_REDIRECT_URI",
    ];

    // Recommended variables for production
    const recommended = [
        "REACT_APP_LOCAL_API_URL",
    ];

    // Check required variables
    required.forEach((key) => {
        if (!envConfig[key as keyof typeof envConfig]) {
            missing.push(key);
        }
    });

    // Check recommended variables
    recommended.forEach((key) => {
        if (!envConfig[key as keyof typeof envConfig]) {
            warnings.push(
                `${key} is not set (recommended for full functionality)`
            );
        }
    });

    // Log results
    console.group("🔧 Environment Configuration Validation");

    if (missing.length === 0) {
        console.log("✅ All required environment variables are present");
    } else {
        console.error("❌ Missing required environment variables:", missing);
    }

    if (warnings.length > 0) {
        console.warn("⚠️ Warnings:", warnings);
    }

    // Log current environment
    console.log("🌍 Current Environment:", {
        ENVIRONMENT: envConfig.ENVIRONMENT || "not set",
        NODE_ENV: envConfig.NODE_ENV || "not set",
        isProduction: envConfig.NODE_ENV === constants.environments.production,
        isDevelopment: envConfig.NODE_ENV === constants.environments.development,
    });

    // Log configured variables (without sensitive data)
    console.log("📋 Configured Variables:", {
        REACT_APP_LOCAL_API_URL: envConfig.REACT_APP_LOCAL_API_URL
            ? "✅ set"
            : "❌ not set",
        REACT_APP_ENABLE_LOGGING: envConfig.REACT_APP_ENABLE_LOGGING || "not set",
        REACT_APP_ENABLE_DARK_MODE: envConfig.REACT_APP_ENABLE_DARK_MODE || "not set",
        REACT_APP_GOOGLE_CLIENT_ID: envConfig.REACT_APP_GOOGLE_CLIENT_ID
            ? "✅ set"
            : "❌ not set",
        REACT_APP_GOOGLE_REDIRECT_URI: envConfig.REACT_APP_GOOGLE_REDIRECT_URI
            ? "✅ set"
            : "❌ not set",
    });

    console.groupEnd();

    return {
        isValid: missing.length === 0,
        missing,
        warnings,
    };
}