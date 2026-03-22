import type { DiffLine, ImageInfo } from "@/types/task/taskComment.types";

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

/** LCS-based line diff */
export function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = oldLines[i - 1] === newLines[j - 1]
                ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const result: DiffLine[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            result.push({ type: "equal", content: oldLines[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.push({ type: "add", content: newLines[j - 1] }); j--;
        } else {
            result.push({ type: "remove", content: oldLines[i - 1] }); i--;
        }
    }
    return result.reverse();
}
