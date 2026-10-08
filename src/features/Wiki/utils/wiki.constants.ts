export const WIKI_SCORE_WEIGHTS = {
    view: 1,
    read: 2,
    edit: 3,
} as const;

// Node size range in px — driven by number of linked infos
export const WIKI_NODE_SIZE = { min: 18, max: 48 } as const;

// Familiarity color gradient (data encoding): neutral gray (0 interactions) → soft green (many).
// Mid-tones on purpose so the ring/tint reads on both the dark and the light canvas.
export const WIKI_NODE_FAMILIARITY = {
    grayInner:  [118, 118, 126] as [number, number, number], // neutral gray
    grayOuter:  [92,  92,  100] as [number, number, number],
    greenInner: [84,  176, 122] as [number, number, number], // desaturated green (≈ sa-good)
    greenOuter: [52,  138,  90] as [number, number, number],
} as const;

// Keyword mention colors in text (MentionText) — CSS vars, used in inline styles
export const WIKI_MENTION = {
    // Regular keyword: faint underline-style hint, muted text
    defaultBg:   "transparent",
    defaultText: "hsl(var(--muted-foreground))",

    // Selected keyword: amber wash so it pops against dimmed surroundings
    selectedBg:   "hsl(var(--sa-accent-amber) / 0.28)",
    selectedText: "hsl(var(--foreground))",

    // Line that contains ≥1 selected keyword: faint amber wash
    lineBg: "hsl(var(--sa-accent-amber) / 0.08)",

    // Opacity applied to lines that do NOT contain any selected keyword
    // (only when a selection is active — draws focus to the matching lines)
    lineDimOpacity: 0.25,
} as const;
