// Character-level LCS diff for showing inline differences between two strings.
// Used in the K repo sync conflict resolver to highlight exactly which characters
// differ between DB and repo versions, similar to VSCode's split-view diff.

export type CharSegment = { type: "equal" | "add" | "remove"; text: string };

/**
 * Computes a character-level diff between two strings using LCS.
 *
 * Tokens are individual code points (preserving multi-byte chars like Vietnamese
 * combining marks) so the highlight tracks the actual visible characters.
 *
 * Returns the segments as a single sequence: `equal` chars appear in both sides,
 * `remove` chars only in `oldStr` (DB), `add` chars only in `newStr` (repo).
 */
export function computeCharDiff(oldStr: string, newStr: string): CharSegment[] {
    const oldChars = [...oldStr];
    const newChars = [...newStr];
    const m = oldChars.length;
    const n = newChars.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = oldChars[i - 1] === newChars[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const raw: CharSegment[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
            raw.push({ type: "equal", text: oldChars[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            raw.push({ type: "add", text: newChars[j - 1] }); j--;
        } else {
            raw.push({ type: "remove", text: oldChars[i - 1] }); i--;
        }
    }
    raw.reverse();

    // Coalesce consecutive segments of the same type for cleaner rendering.
    const merged: CharSegment[] = [];
    for (const s of raw) {
        const last = merged[merged.length - 1];
        if (last && last.type === s.type) last.text += s.text;
        else merged.push({ ...s });
    }
    return merged;
}
