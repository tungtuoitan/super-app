

/**
 * Request payload for updating/upserting user profile
 * Matches backend UpdateUserProfileRequest DTO
 * All fields are optional - only non-null fields will be updated
 */
export interface UpdateUserProfileRequest {
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    dateOfBirth?: string | null; // ISO date string
    gender?: string | null;
    country?: string | null;
    city?: string | null;
    timezone?: string | null;
    language?: string | null;
    filters?: string | null; // JSON string of UserFilters
}

