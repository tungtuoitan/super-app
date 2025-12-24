/**
 * Google OAuth Configuration and Utilities
 * Handles Google OAuth 2.0 Authorization Code Flow
 */

import { constants } from '@/utils/constants';

/**
 * Get redirect URI based on environment
 * Auto-detects production URL or uses env variable override
 */
const getRedirectUri = (): string => {
  // Allow env variable override for custom domains
  if (process.env.REACT_APP_GOOGLE_REDIRECT_URI && process.env.ENVIRONMENT === constants.environments.production) {
    return process.env.REACT_APP_GOOGLE_REDIRECT_URI;
  }

  // Auto-detect based on current origin (works for localhost and production)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  // Fallback for SSR/build time
  return 'http://localhost:3000/auth/callback';
};

export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '887853390661-j2bepobhb90k357d0k5p1atqd2k8oe6l.apps.googleusercontent.com',
  redirectUri: getRedirectUri(),
  scope: 'openid profile email',
  responseType: 'code',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
} as const;

/**
 * Initiate Google OAuth login flow
 * Redirects user to Google OAuth consent screen
 */
export function initiateGoogleLogin(): void {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: GOOGLE_OAUTH_CONFIG.responseType,
    scope: GOOGLE_OAUTH_CONFIG.scope,
    access_type: 'offline',
    prompt: 'consent'
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
  return params.get('code');
}

/**
 * Extract error from OAuth callback URL
 * @param search URL search params
 * @returns Error message or null if no error
 */
export function extractOAuthError(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get('error');
}
