import type { CustomTabsJSON } from "@/features/taskDetail/types/customTab.types";

/** Generate a simple unique ID */
export function generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse customTabsJson string → CustomTabsJSON, return empty if invalid */
export function parseCustomTabs(json: string | null | undefined): CustomTabsJSON {
    if (!json) return { tabs: [] };
    try {
        const parsed = JSON.parse(json);
        if (parsed?.tabs && Array.isArray(parsed.tabs)) return parsed as CustomTabsJSON;
    } catch { /* invalid JSON */ }
    return { tabs: [] };
}

/** Serialize CustomTabsJSON → string for storage */
export function serializeCustomTabs(data: CustomTabsJSON): string {
    return JSON.stringify(data);
}

/** Auto-increment version: if numeric → +1, otherwise append ".1" */
export function incrementVersion(current: string): string {
    const num = Number(current);
    if (!isNaN(num)) return String(num + 1);
    const dotIdx = current.lastIndexOf(".");
    if (dotIdx >= 0) {
        const suffix = Number(current.slice(dotIdx + 1));
        if (!isNaN(suffix)) return current.slice(0, dotIdx + 1) + (suffix + 1);
    }
    return current + ".1";
}

/** Strip HTML tags to plain text (internal helper) */
function stripHtml(html: string): string {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?(p|div)[^>]*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

export function extractNameVersion(content: string): { name: string; version: string } {
    const text = stripHtml(content);
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let name = "Untitled";
    let version = "1";
    for (const line of lines) {
        if (line.toLowerCase().startsWith("name:")) {
            name = line.slice(5).trim() || "Untitled";
        } else if (line.toLowerCase().startsWith("version:")) {
            version = line.slice(8).trim() || "1";
        } else if (line === "--") {
            break;
        }
    }
    return { name, version };
}

/** Validate that content follows the required header format */
export function validateCustomTabFormat(content: string): string | null {
    const text = stripHtml(content);
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return "Required format: Name: xxx / Version: xxx / --";
    if (!lines[0].toLowerCase().startsWith("name:")) return "Line 1 must start with 'Name:'";
    if (!lines[0].slice(5).trim()) return "Name cannot be empty";
    if (!lines[1].toLowerCase().startsWith("version:")) return "Line 2 must start with 'Version:'";
    if (!lines.some((l) => l === "--")) return "Missing '--' separator after header";
    return null;
}

/** Generate default RichText HTML content for a new custom tab */
export function generateDefaultContent(tabNumber: number): string {
    return `<p>Name: Tab ${tabNumber}</p><p>Version: 1</p><p>--</p><p></p>`;
}
