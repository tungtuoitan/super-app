/**
 * Theme-aware colors for the Wiki graph canvas (#1514).
 * Canvas 2D cannot resolve CSS variables, so the design tokens defined in
 * src/index.css are read from :root and turned into concrete `hsla()` strings.
 * Reading happens per frame (cheap: computed style is cached by the browser),
 * so a light/dark theme switch is picked up immediately.
 */

export interface WikiGraphPalette {
    background: string;
    dot: string;
    edge: string;
    edgeActive: string;
    nodeFill: string;
    nodeRing: string;
    label: string;
    accent: string;
    accentSoft: string;
    accentGlow: string;
    marked: string;
}

/** Converts a token triplet like "240 4% 5%" into "hsla(240, 4%, 5%, a)". */
export const tokenToHsla = (triplet: string, alpha = 1): string => {
    const parts = triplet.trim().split(/\s+/);
    if (parts.length < 3) return `rgba(128, 128, 128, ${alpha})`;
    return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
};

export const getWikiGraphPalette = (): WikiGraphPalette => {
    const css = getComputedStyle(document.documentElement);
    const tok = (name: string, alpha = 1) => tokenToHsla(css.getPropertyValue(name), alpha);
    return {
        background: tok("--background"),
        dot: tok("--muted-foreground", 0.14),
        edge: tok("--muted-foreground", 0.55),
        edgeActive: tok("--sa-accent-amber", 0.85),
        nodeFill: tok("--sa-surface-2"),
        nodeRing: tok("--sa-border-strong"),
        label: tok("--foreground"),
        accent: tok("--sa-accent-amber"),
        accentSoft: tok("--sa-accent-amber", 0.16),
        accentGlow: tok("--sa-accent-amber", 0.45),
        marked: tok("--foreground", 0.55),
    };
};
