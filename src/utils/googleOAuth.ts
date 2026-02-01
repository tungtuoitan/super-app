/**
 * Google OAuth Configuration and Utilities
 * Handles Google OAuth 2.0 Authorization Code Flow with PKCE
 */

import { envConfig } from "@/config/env.config";
import { constants } from "@/utils/constants";
import { generateCodeVerifier, generateCodeChallenge, generateState, storePkceValues } from "@/utils/pkce.utils";

/**
 * Get redirect URI based on environment
 * Auto-detects production URL or uses env variable override
 */
const getRedirectUri = (): string => {
  // Allow env variable override for custom domains
  if (envConfig.REACT_APP_GOOGLE_REDIRECT_URI && envConfig.REACT_APP_ENVIRONMENT === constants.environments.production) {
    return envConfig.REACT_APP_GOOGLE_REDIRECT_URI;
  }

  // Auto-detect based on current origin (works for localhost and production)
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  // Fallback for SSR/build time
  return "http://localhost:3000/auth/callback";
};

export const GOOGLE_OAUTH_CONFIG = {
  clientId: envConfig.REACT_APP_GOOGLE_CLIENT_ID || "887853390661-j2bepobhb90k357d0k5p1atqd2k8oe6l.apps.googleusercontent.com",
  redirectUri: getRedirectUri(),
  // Include drive.file scope for uploading files to user's Google Drive
  scope: "openid profile email https://www.googleapis.com/auth/drive.file",
  responseType: "code",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
} as const;

/**
 * Initiate Google OAuth login flow with PKCE
 * Generates PKCE values and redirects user to Google OAuth consent screen
 */
export async function initiateGoogleLogin(): Promise<void> {
    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE values for callback validation
    storePkceValues(codeVerifier, state);

    // Build auth URL with PKCE parameters
    const params = new URLSearchParams({
        client_id: GOOGLE_OAUTH_CONFIG.clientId,
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
        response_type: GOOGLE_OAUTH_CONFIG.responseType,
        scope: GOOGLE_OAUTH_CONFIG.scope,
        access_type: "offline",
        prompt: "consent",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state,
    });

    const authUrl = `${GOOGLE_OAUTH_CONFIG.authUrl}?${params.toString()}`;

    // Redirect to Google OAuth
    window.location.href = authUrl;
}

/**
 * Extract authorization code from OAuth callback URL
 * @param search URL search params (e.g., window.location.search)
 * @returns Authorization code or null if not found
 */
export function extractAuthCodeFromUrl(search: string): string | null {
    const params = new URLSearchParams(search);
    return params.get("code");
}

/**
 * Extract state parameter from OAuth callback URL
 * @param search URL search params (e.g., window.location.search)
 * @returns State parameter or null if not found
 */
export function extractStateFromUrl(search: string): string | null {
    const params = new URLSearchParams(search);
    return params.get("state");
}

/**
 * Extract error from OAuth callback URL
 * @param search URL search params
 * @returns Error message or null if no error
 */
export function extractOAuthError(search: string): string | null {
    const params = new URLSearchParams(search);
    return params.get("error");
}
