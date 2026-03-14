/**
 * searchUtils.ts — diacritic-insensitive search helpers for K module
 *
 * Strategy: NFC normalise → NFD decompose → strip combining marks
 * This keeps string length identical to NFC, so byte positions are preserved
 * and original characters can be highlighted correctly.
 *
 * Examples: "Bát" → "Bat", "khoăn" → "khoan", "đường" → "duong"
 */

/**
 * Remove diacritical marks and normalise Vietnamese letters (đ → d).
 * Input is first normalised to NFC (composed), then to NFD (decomposed),
 * then combining marks (U+0300–U+036F) are stripped.
 * The result has exactly the same length as the NFC input.
 */
export function removeDiacritics(str: string): string {
    return str
        .normalize("NFC")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, c => (c === "đ" ? "d" : "D"));
}

/**
 * Check whether `text` contains `query` with diacritic-insensitive,
 * case-insensitive matching.
 */
export function containsNormalized(text: string, query: string): boolean {
    if (!query.trim()) return true;
    return removeDiacritics(text).toLowerCase().includes(
        removeDiacritics(query.trim()).toLowerCase(),
    );
}
