/**
 * Application Configuration
 * App-wide settings, constants, and feature flags
 * Environment-based configuration with secure defaults
 */

import { constants } from '@/utils/constants';

/**
 * Main application configuration
 * Contains app metadata and feature flags based on environment variables
 */
export const APP_CONFIG = {
    name: 'SuperApp',
    version: '0.1.0',
    environment: process.env.ENVIRONMENT || process.env.NODE_ENV || constants.environments.development,
    enableLogging: process.env.REACT_APP_ENABLE_LOGGING === 'true',
    enableDarkMode: process.env.REACT_APP_ENABLE_DARK_MODE === 'true',
} as const;

/**
 * Access rights configuration
 * Defines available access levels and permissions within the application
 */
export const ACCESS_RIGHTS = {
    finShark: 'finShark',
    learnCSharp: 'learnCSharp',
    nothing: 'nothing',
} as const;

/**
 * Supported locales configuration
 * Defines all supported language/region combinations for internationalization
 */
export const LOCALES = {
    'en-au': 'en-au',
    'en-ca': 'en-ca',
    'en-gb': 'en-gb',
    'en-ie': 'en-ie',
    'en-nz': 'en-nz',
    'en-us': 'en-us',
    'nl-be': 'nl-be',
    'nl': 'nl',
    'sk': 'sk',
    'cs': 'cs',
    'zh-cn': 'zh-cn',
    'zh-hk': 'zh-hk',
    'zh-tw': 'zh-tw',
    'ja': 'ja',
    'fr-ca': 'fa-ca',
    'fr-ch': 'fa-ch',
    'fr': 'fr',
    'vi-vn': 'vi-vn',
} as const;

/**
 * Locale type derived from LOCALES configuration
 * Ensures type safety when working with locale values
 */
export type Locale = keyof typeof LOCALES;
