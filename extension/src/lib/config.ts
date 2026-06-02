export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "";

export const STORAGE_KEYS = {
    accessToken: "sa_access_token",
    tokenExpiresAt: "sa_token_expires_at",
    userEmail: "sa_user_email",
    userId: "sa_user_id",
} as const;

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_SCOPE =
    "openid profile email https://www.googleapis.com/auth/drive.file";
