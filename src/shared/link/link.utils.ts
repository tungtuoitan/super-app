import { linkConstants } from "./link.constants";
import type { LinkKind } from "./link.types";

export const _isLinkMime = (mimeType?: string | null): boolean => mimeType === linkConstants.mimeType;

/** Only absolute http/https URLs (the BE rejects anything else). */
export const _isSafeUrl = (url?: string | null): boolean => {
    if (!url) return false;
    try {
        const parsed = new URL(url.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

/** Add https:// when the user typed a bare host ("github.com/x"). */
export const _normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

export const _getLinkKind = (url?: string | null): LinkKind => {
    if (!_isSafeUrl(url)) return linkConstants.kinds.web;
    const host = new URL(url!.trim()).hostname.toLowerCase();
    if (host === "github.com" || host.endsWith(".github.com")) return linkConstants.kinds.github;
    if (host === "drive.google.com" || host === "docs.google.com") return linkConstants.kinds.drive;
    return linkConstants.kinds.web;
};

/** Open in a new tab without giving the page access to window.opener. */
export const _openExternalUrl = (url?: string | null): boolean => {
    if (!_isSafeUrl(url)) return false;
    window.open(url!.trim(), "_blank", "noopener,noreferrer");
    return true;
};

/**
 * GitHub URL pointing into a repo (task #1488): github.com/<owner>/<repo>, optionally /blob/... or
 * /tree/... (optionally #L5 / #L5-L10), or /commit/<sha>. Not other GitHub pages (pull, issues…).
 */
export const _isGithubRepoUrl = (url?: string | null): boolean => {
    if (!_isSafeUrl(url)) return false;
    const u = new URL(url!.trim());
    const host = u.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return false;
    if (u.hash && !/^#L\d+(-L\d+)?$/.test(u.hash)) return false;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || (linkConstants.githubNonRepoOwners as readonly string[]).includes(parts[0].toLowerCase())) return false;
    if (parts.length === 2) return true;
    if (parts[2] === "commit") return parts.length === 4 && /^[0-9a-f]{7,40}$/i.test(parts[3]);
    return parts.length >= 4 && (parts[2] === "blob" || parts[2] === "tree");
};

/** Hand a GitHub repo URL to the local "tungroot://" handler (VS Code). Unregistered protocol → browser does nothing. */
export const _openLocalUrl = (url?: string | null): boolean => {
    if (!_isGithubRepoUrl(url)) return false;
    window.location.href = linkConstants.localOpenPrefix + encodeURIComponent(url!.trim());
    return true;
};

export const _validateLinkForm = (name: string, url: string, showUrl: boolean): { name?: string; url?: string } => {
    const errors: { name?: string; url?: string } = {};
    if (name.trim().length > linkConstants.maxNameLength) errors.name = `Max ${linkConstants.maxNameLength} characters`;
    if (!showUrl && !name.trim()) errors.name = "Name is required";
    if (showUrl) {
        const normalized = _normalizeUrl(url);
        if (!normalized) errors.url = "URL is required";
        else if (normalized.length > linkConstants.maxUrlLength) errors.url = `Max ${linkConstants.maxUrlLength} characters`;
        else if (!_isSafeUrl(normalized)) errors.url = "Only http/https links";
    }
    return errors;
};

/** Same fallback name as the BE: host + path of the URL. */
export const _linkDefaultName = (url: string): string => {
    try {
        const u = new URL(url.trim());
        return (u.host + u.pathname).replace(/\/+$/, "") || url.trim();
    } catch {
        return url.trim();
    }
};
