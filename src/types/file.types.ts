/**
 * File Types and Interfaces
 * Domain models and DTOs for the file feature
 */

import type { FileEntity } from "@/types/workspace-v2.types";

/**
 * File domain model (extends FileEntity with UI state & business logic)
 * Use this for in-app state management and UI components
 */
export interface File extends Omit<FileEntity, 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
    // Override userId to optional (not always available when transforming from WorkspaceItem)
    userId?: number;

    // Override date types from ISO string to Date for domain model
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;

    // Add any UI/business fields here in future
    // Example: isDownloading?: boolean;
}

// API DTOs (what backend sends/receives)
export interface FileDTO {
    id: number;
    userId: number;
    name: string;
    url?: string;
    fileSize?: number;
    mimeType?: string;
    extension?: string;
    statusCode?: string;
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
    deletedAt?: string | null; // ISO string
    fileSizeFormatted?: string;
}

// Create request
export interface CreateFileDTO {
    name: string;
    url?: string;
    fileSize?: number;
    mimeType?: string;
    extension?: string;
    statusCode?: string;
}

// Update request
export interface UpdateFileDTO {
    name?: string;
    url?: string;
    fileSize?: number;
    mimeType?: string;
    extension?: string;
    statusCode?: string;
}

// Query parameters
export interface GetFilesParams {
    page?: number;
    pageSize?: number;
    searchText?: string;
    mimeType?: string;
    statusCode?: string;
}

// API Response wrapper
export interface FilesResponse {
    data: FileDTO[];
    success: boolean;
    message?: string;
}

export interface FileResponse {
    data: FileDTO;
    success: boolean;
    message?: string;
}
