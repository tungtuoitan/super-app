export const WIKI_COLOR = "#8b5cf6";

export const WIKI_SCORE_WEIGHTS = {
    view: 1,
    read: 2,
    edit: 3,
} as const;

// Node size range in px — driven by number of linked infos
export const WIKI_NODE_SIZE = { min: 18, max: 48 } as const;

// Familiarity color gradient: gray (0 interactions) → green (many interactions)
export const WIKI_NODE_FAMILIARITY = {
    grayInner:  [82,  82,  91 ] as [number, number, number], // zinc-600  #52525b
    grayOuter:  [39,  39,  42 ] as [number, number, number], // zinc-800  #27272a
    greenInner: [74, 222, 128 ] as [number, number, number], // green-400 #4ade80
    greenOuter: [21, 128,  61 ] as [number, number, number], // green-700 #15803d
} as const;

// Marked node: amber/gold accent (persistent bookmark, max 5)
export const WIKI_NODE_MARKED = {
    ring:  "#fbbf24",  // amber-400
    glow:  "#f59e0b",  // amber-500
    badge: "#fbbf24",  // amber-400
} as const;

// Selected node: violet accent
export const WIKI_NODE_SELECTED = {
    inner: "#c4b5fd", // violet-300
    outer: "#7c3aed", // violet-700
    glow:  "#a78bfa", // violet-400
    ring:  "#c4b5fd", // violet-300
} as const;

// Keyword mention colors in text (MentionText)
export const WIKI_MENTION = {
    // Regular keyword: faint underline-style hint, muted text
    defaultBg:   "transparent",
    defaultText: "#71717a",           // zinc-500 — subtle, readable

    // Selected keyword: vivid violet so it pops against dimmed surroundings
    selectedBg:   "rgba(139,92,246,0.32)", // violet @32% — clearly visible
    selectedText: "#ede9fe",               // violet-100 — near-white violet, maximum contrast

    // Line that contains ≥1 selected keyword: warm violet wash
    lineBg: "rgba(139,92,246,0.10)",

    // Opacity applied to lines that do NOT contain any selected keyword
    // (only when a selection is active — draws focus to the matching lines)
    lineDimOpacity: 0.25,
} as const;
