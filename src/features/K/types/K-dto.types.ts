import { KItemV2 } from "./K-v2.types";

/**
 * KDTO — unified K knowledge DTO
 * Maps to backend KKnowledgeDTO (k.knowledge + flat list of k.node)
 */
export interface KDTO {
    /** k.knowledge.id */
    id: number;

    /** Owner user ID */
    userId: number;

    /** Knowledge name */
    name: string;

    /** Knowledge description */
    description?: string | null;

    statusCode?: string | null;

    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;

    /**
     * Flat list of nodes. Frontend builds hierarchy using parentId.
     * Each item maps to one k.node row.
     */
    flatData: KItemV2[];
}
