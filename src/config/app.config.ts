/**
 * Application Configuration
 * Centralized configuration constants for the entire application
 */

import { constants } from "@/shared";
import { envConfig } from "./env.config";

export const config = {
    api: {
        baseURL: envConfig.NODE_ENV === "production" ? "" : envConfig.REACT_APP_LOCAL_API_URL || "http://localhost:5000",
        timeout: 30000,
        headers: {
            "Content-Type": "application/json",
        },
    } as const,
    app: {
        name: "SuperApp",
        version: "0.1.0",
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
