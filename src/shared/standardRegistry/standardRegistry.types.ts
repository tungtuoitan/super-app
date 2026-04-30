/**
 * Standard Registry Feature Types
 * Domain models and DTOs for standard registry data
 */

import { constants } from "@/shared";


// Standard Registry Types
export type RegistryType = typeof constants.standardRegistryFE.types.hashtag | typeof constants.standardRegistryFE.types.entity | typeof constants.standardRegistryFE.types.workspaceStatus | typeof constants.standardRegistryFE.types.noteStatus | string;

// Domain Model (what we use in the app)
export interface StandardRegistry {
    id: number;
    code: string;
    description?: string;
    type: string;
    isActive: boolean;
    json_detail?: string;
    createdBy?: string;
    createdDate?: Date;
    lastModifiedBy?: string;
    lastModifiedDate?: Date;
}

// API DTO (what backend sends)
export interface StandardRegistryDTO {
    id: number;
    code: string;
    description?: string;
    type: string;
    isActive: boolean;
    json_detail?: string;
    createdBy?: string;
    createdDate?: string; // ISO string
    lastModifiedBy?: string;
    lastModifiedDate?: string; // ISO string
}

// API Response wrapper
export interface StandardRegistryResponse {
    data: StandardRegistryDTO[];
    success: boolean;
    message?: string;
}

// Query parameters for filtering
export interface GetStandardRegistryParams {
    type?: string; // Optional - filter by type
    showAll?: boolean; // Include inactive items
}
