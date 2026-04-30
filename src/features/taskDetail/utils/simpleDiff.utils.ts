import {DiffLine, ImageInfo, InlineSegment} from "../types/taskComment.types";

/** Strip HTML tags → plain text, collapse whitespace, keep line breaks */
export function htmlToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote|tr|td|th)[^>]*>/gi, "\n")
        .replace(/<img[^>]*>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function extractImages(html: string): ImageInfo[] {
    const imgs: ImageInfo[] = [];
    const regex = /<img[^>]*data-file-id="(\d+)"[^>]*(?:src="([^"]*)")?[^>]*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
        imgs.push({ fileId: m[1], src: m[2] || "" });
    }
    const regex2 = /<img[^>]*src="([^"]*)"[^>]*data-file-id="(\d+)"[^>]*\/?>/gi;
    while ((m = regex2.exec(html)) !== null) {
        if (!imgs.some((i) => i.fileId === m![2])) {
            imgs.push({ fileId: m[2], src: m[1] || "" });
        }
    }
    return imgs;
}

export function computeImageDiff(oldHtml: string, newHtml: string) {
    const oldImgs = extractImages(oldHtml);
    const newImgs = extractImages(newHtml);
    const oldIds = new Set(oldImgs.map((i) => i.fileId));
    const newIds = new Set(newImgs.map((i) => i.fileId));
    return {
        added: newImgs.filter((i) => !oldIds.has(i.fileId)),
        removed: oldImgs.filter((i) => !newIds.has(i.fileId)),
    };
}

/** Word-level inline diff using LCS on tokens */
export function computeInlineDiff(oldStr: string, newStr: string): InlineSegment[] {
    const tokenize = (s: string) => {
        const tokens: string[] = [];
        let buf = "";
        for (const ch of s) {
            if (/\s/.test(ch)) {
                if (buf) { tokens.push(buf); buf = ""; }
                tokens.push(ch);
            } else {
                buf += ch;
            }
        }
        if (buf) tokens.push(buf);
        return tokens;
    };

    const oldTokens = tokenize(oldStr);
    const newTokens = tokenize(newStr);
    const m = oldTokens.length;
    const n = newTokens.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = oldTokens[i - 1] === newTokens[j - 1]
                ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const segments: InlineSegment[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
            segments.push({ type: "equal", text: oldTokens[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            segments.push({ type: "add", text: newTokens[j - 1] }); j--;
        } else {
            segments.push({ type: "remove", text: oldTokens[i - 1] }); i--;
        }
    }
    return segments.reverse();
}

/** Check if two lines are similar enough to be a "modify" pair */
function isSimilar(a: string, b: string): boolean {
    if (!a && !b) return true;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return true;
    let common = 0;
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length > b.length ? a : b;
    const longerSet = new Map<string, number>();
    for (const ch of longer) longerSet.set(ch, (longerSet.get(ch) ?? 0) + 1);
    for (const ch of shorter) {
        const cnt = longerSet.get(ch) ?? 0;
        if (cnt > 0) { common++; longerSet.set(ch, cnt - 1); }
    }
    return common / maxLen > 0.4;
}

/** LCS-based line diff with modify pairing and line numbers */
export function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = oldLines[i - 1] === newLines[j - 1]
                ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const raw: DiffLine[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            raw.push({ type: "equal", content: oldLines[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            raw.push({ type: "add", content: newLines[j - 1] }); j--;
        } else {
            raw.push({ type: "remove", content: oldLines[i - 1] }); i--;
        }
    }
    raw.reverse();

    // Pair adjacent remove+add into modify when lines are similar
    const paired: DiffLine[] = [];
    for (let k = 0; k < raw.length; k++) {
        if (raw[k].type === "remove" && k + 1 < raw.length && raw[k + 1].type === "add" && isSimilar(raw[k].content, raw[k + 1].content)) {
            const segments = computeInlineDiff(raw[k].content, raw[k + 1].content);
            const oldSegments = segments.filter((s) => s.type === "equal" || s.type === "remove");
            const newSegments = segments.filter((s) => s.type === "equal" || s.type === "add");
            paired.push({ type: "modify", content: raw[k].content, segments: oldSegments, side: "old" });
            paired.push({ type: "modify", content: raw[k + 1].content, segments: newSegments, side: "new" });
            k++;
        } else {
            paired.push(raw[k]);
        }
    }

    // Assign line numbers
    let oldNo = 1, newNo = 1;
    for (const line of paired) {
        if (line.type === "equal") { line.oldLineNo = oldNo++; line.newLineNo = newNo++; }
        else if (line.type === "remove") { line.oldLineNo = oldNo++; }
        else if (line.type === "add") { line.newLineNo = newNo++; }
        else if (line.type === "modify" && line.side === "old") { line.oldLineNo = oldNo++; }
        else if (line.type === "modify" && line.side === "new") { line.newLineNo = newNo++; }
    }

    return paired;
}
