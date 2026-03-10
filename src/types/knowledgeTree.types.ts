// ─── Domain models (frontend) ────────────────────────────────────────────────

export interface Knowledge {
    id: number;
    userId: number;
    parentId: number | null;
    title: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}

export interface KnowledgeCard {
    id: number;
    knowledgeId: number;
    parentCardId?: number;
    userId: number;
    keyword: string;
    title: string;
    description: string;
    isDefinition: boolean;
    linkedCardIds: number[];
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}

// ─── DTOs (wire format from API) ──────────────────────────────────────────────

export interface KnowledgeDTO {
    id: number;
    userId: number;
    parentId: number | null;
    title: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface KnowledgeCardDTO {
    id: number;
    knowledgeId: number;
    parentCardId?: number;
    userId: number;
    keyword: string;
    title: string;
    description?: string;
    isDefinition: boolean;
    /** sourceLinks from EF navigation — array of { targetCardId } */
    sourceLinks?: Array<{ id: number; sourceCardId: number; targetCardId: number }>;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

// ─── Upsert DTOs (request body) ───────────────────────────────────────────────

export interface UpsertKnowledgeDTO {
    id: number;
    userId?: number;
    parentId?: number | null;
    title: string;
    description?: string;
    deletedAt?: string | null;
}

export interface UpsertKnowledgeCardDTO {
    id: number;
    userId?: number;
    knowledgeId: number;
    parentCardId?: number | null;
    keyword: string;
    title: string;
    description?: string;
    isDefinition: boolean;
    linkedCardIds: number[];
    deletedAt?: string | null;
}
