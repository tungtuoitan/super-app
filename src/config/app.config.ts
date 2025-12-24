/**
 * Application Configuration
 * Centralized configuration constants for the entire application
 */

import { constants } from "@/utils/constants";
import { envConfig } from "./env.config";

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
    const required = ["NODE_ENV"];

    // Recommended variables for production
    const recommended = [
        "REACT_APP_LOCAL_API_URL",
        "REACT_APP_GOOGLE_CLIENT_ID",
        "REACT_APP_GOOGLE_REDIRECT_URI",
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

export const config = {
    api: {
        baseURL:
            envConfig.NODE_ENV === "production"
                ? ""
                : envConfig.REACT_APP_LOCAL_API_URL || "http://localhost:5000",
        timeout: 30000,
        headers: {
            "Content-Type": "application/json",
        },
    } as const,
    app: {
        name: "SuperApp",
        version: "0.1.0",
        environment:
            envConfig.ENVIRONMENT ||
            envConfig.NODE_ENV ||
            constants.environments.development,
        enableLogging: envConfig.REACT_APP_ENABLE_LOGGING === "true",
        enableDarkMode: envConfig.REACT_APP_ENABLE_DARK_MODE === "true",
    } as const,
    locales: {
        "en-au": "en-au",
        "en-ca": "en-ca",
        "en-gb": "en-gb",
        "en-ie": "en-ie",
        "en-nz": "en-nz",
        "en-us": "en-us",
        "nl-be": "nl-be",
        nl: "nl",
        sk: "sk",
        cs: "cs",
        "zh-cn": "zh-cn",
        "zh-hk": "zh-hk",
        "zh-tw": "zh-tw",
        ja: "ja",
        "fr-ca": "fa-ca",
        "fr-ch": "fa-ch",
        fr: "fr",
        "vi-vn": "vi-vn",
    } as const,
} as const;

/**
 * Locale type derived from LOCALES configuration
 * Ensures type safety when working with locale values
 */
export type Locale = keyof typeof config.locales;
