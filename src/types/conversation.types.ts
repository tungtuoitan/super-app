// ── Domain models ─────────────────────────────────────────────────────────

export interface ConTopic {
    id: number;
    userId: number;
    entityType?: string | null;
    entityId?: number | null;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
}

export interface ConMessage {
    id: number;
    userId: number;
    topicId?: number | null;
    entityType?: string | null;
    entityId?: number | null;
    parentId?: number | null;
    type?: string | null;
    title?: string | null;
    content?: string | null;
    trackId?: number | null;
    location?: string | null;
    occurAt?: Date | null;
    isSensitive: boolean;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
    replies?: ConMessage[];
}

// ── DTOs (dates as strings from API) ──────────────────────────────────────

export interface ConTopicDTO {
    id: number;
    userId: number;
    entityType?: string | null;
    entityId?: number | null;
    name: string;
    description?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface ConMessageDTO {
    id: number;
    userId: number;
    topicId?: number | null;
    entityType?: string | null;
    entityId?: number | null;
    parentId?: number | null;
    type?: string | null;
    title?: string | null;
    content?: string | null;
    trackId?: number | null;
    location?: string | null;
    occurAt?: string | null;
    isSensitive: boolean;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
    replies?: ConMessageDTO[];
}

// ── Request types ──────────────────────────────────────────────────────────

export interface UpsertTopicDTO {
    id: number;
    entityType?: string | null;
    entityId?: number | null;
    name: string;
    description?: string | null;
    deletedAt?: string | null;
}

export interface UpsertMessageDTO {
    id: number;
    topicId?: number | null;
    entityType?: string | null;
    entityId?: number | null;
    parentId?: number | null;
    type?: string | null;
    title?: string | null;
    content?: string | null;
    trackId?: number | null;
    location?: string | null;
    occurAt?: string | null;
    isSensitive?: boolean;
    deletedAt?: string | null;
}
