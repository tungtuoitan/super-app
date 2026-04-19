export interface WikiKeyword {
    id: number;
    name: string;
    description?: string;
    synonyms: string[];
    infoIds: number[];
    /** base64 data URL (webp 32×32) or undefined */
    icon?: string;
    // interaction counts
    views: number;
    reads: number;
    edits: number;
    // graph position (persisted per user)
    posX?: number;
    posY?: number;
    pinnedPosition: boolean;
    deletedAt?: string;
}

export interface WikiInfo {
    id: number;
    title: string;
    content: string; // markdown
    keywordIds: number[];
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface WikiExtractResult {
    existingMatches: { keywordId: number; relevance: number }[];
    newSuggestions: string[];
}

export type WikiTabData = {
    keywordId: number | null; // null = show all
};
