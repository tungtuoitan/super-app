/**
 * String utility functions
 */

/**
 * Remove Vietnamese diacritics (accents)
 * Example: "Tiếng Việt" -> "Tieng Viet"
 */
export function removeDiacritics(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

/**
 * Find all matching character indices in text for search query
 * Returns array of indices where characters match (case-insensitive, diacritics-insensitive)
 */
export function findMatchIndices(text: string, searchQuery: string): number[] {
    if (!searchQuery.trim()) return [];

    const textNormalized = removeDiacritics(text.toLowerCase());
    const queryNormalized = removeDiacritics(searchQuery.toLowerCase());
    const matchIndices: number[] = [];

    let queryIndex = 0;
    
    for (let textIndex = 0; textIndex < textNormalized.length; textIndex++) {
        if (queryIndex < queryNormalized.length && textNormalized[textIndex] === queryNormalized[queryIndex]) {
            matchIndices.push(textIndex);
            queryIndex++;
        }
    }

    return matchIndices;
}

/**
 * Check if search words match text using fuzzy matching (without diacritics)
 * Returns match status and score for ranking
 * Supports both word-based and character-by-character matching
 */
export function fuzzyMatchWithDiacritics(text: string, searchWords: string[]): { match: boolean; score: number; matchedIndices: number[] } {
    const textNormalized = removeDiacritics(text.toLowerCase());
    const searchQuery = searchWords.join(" ");
    const queryNormalized = removeDiacritics(searchQuery.toLowerCase());
    
    // Try character-by-character matching first (for better single-word matching like "dim" -> "Diễm")
    const charMatch = fuzzyMatchCharacters(textNormalized, queryNormalized);
    if (charMatch.match) {
        return charMatch;
    }
    
    // Fallback to word-based matching (for multi-word queries)
    let matchedCount = 0;
    let totalPosition = 0;
    const allMatchedIndices: number[] = [];

    // Check if each word exists in text (any order)
    for (const word of searchWords) {
        const wordNormalized = removeDiacritics(word.toLowerCase());
        const foundIndex = textNormalized.indexOf(wordNormalized);

        if (foundIndex !== -1) {
            matchedCount++;
            totalPosition += foundIndex;

            // Track matched character indices
            for (let i = 0; i < wordNormalized.length; i++) {
                allMatchedIndices.push(foundIndex + i);
            }
        } else {
            // Word not found
            return { match: false, score: 0, matchedIndices: [] };
        }
    }

    // Score: higher if more words match and words are near the start
    const score = matchedCount * 1000 - totalPosition;
    
    // Remove duplicates and sort indices
    const uniqueIndices = Array.from(new Set(allMatchedIndices)).sort((a, b) => a - b);
    
    return { match: true, score, matchedIndices: uniqueIndices };
}

/**
 * Character-by-character fuzzy matching (like VS Code)
 * "dim" matches "Diễm" by finding sequential characters
 */
function fuzzyMatchCharacters(text: string, query: string): { match: boolean; score: number; matchedIndices: number[] } {
    if (!query) return { match: true, score: 0, matchedIndices: [] };
    
    const matchedIndices: number[] = [];
    let queryIndex = 0;
    let lastMatchIndex = -1;
    
    for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex++) {
        if (text[textIndex] === query[queryIndex]) {
            matchedIndices.push(textIndex);
            lastMatchIndex = textIndex;
            queryIndex++;
        }
    }
    
    // All query characters must be found in order
    if (queryIndex === query.length) {
        // Score based on:
        // 1. How early the match starts (lower is better)
        // 2. How compact the match is (lower span is better)
        const firstMatchIndex = matchedIndices[0] || 0;
        const matchSpan = lastMatchIndex - firstMatchIndex;
        const score = 5000 - (firstMatchIndex * 10) - matchSpan;
        
        return { match: true, score, matchedIndices };
    }
    
    return { match: false, score: 0, matchedIndices: [] };
}
