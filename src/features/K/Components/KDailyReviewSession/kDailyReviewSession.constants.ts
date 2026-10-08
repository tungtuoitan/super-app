export const REVEAL_DELAY_MS = 3000;
export const SCORE_DELAY_MS = 3000;

// Grade palette (tokens): 1=Again(danger) 2=Hard(muted) 3=Okay(muted) 4=Good(foreground) 5=Easy(good)
export const BALL_BG: Record<number, string> = {
    1: "hsl(var(--sa-danger) / 0.88)",
    2: "hsl(var(--sa-muted) / 0.88)",
    3: "hsl(var(--sa-muted) / 0.88)",
    4: "hsl(var(--foreground) / 0.88)",
    5: "hsl(var(--sa-good) / 0.88)",
};
export const RING_COLOR: Record<number, string> = {
    1: "hsl(var(--sa-danger))",
    2: "hsl(var(--sa-muted))",
    3: "hsl(var(--sa-muted))",
    4: "hsl(var(--foreground))",
    5: "hsl(var(--sa-good))",
};
export const NEUTRAL_RING = "hsl(var(--sa-border-strong))";
export const NEUTRAL_BALL_BG = "hsl(var(--sa-surface-2) / 0.9)";
export const TEXT_COLOR: Record<number, string> = {
    1: "text-sa-danger",
    2: "text-muted-foreground",
    3: "text-muted-foreground",
    4: "text-foreground",
    5: "text-sa-good",
};

export const SCORE_BUTTONS = [
    { score: 1, label: "Again", btnClass: "border-sa-danger/40 text-sa-danger hover:bg-sa-danger/10 hover:text-sa-danger" },
    { score: 2, label: "Hard",  btnClass: "border-sa-border-strong text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground" },
    { score: 3, label: "Okay",  btnClass: "border-sa-border-strong text-foreground hover:bg-sa-hover-strong" },
    { score: 4, label: "Good",  btnClass: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" },
    { score: 5, label: "Easy",  btnClass: "border-sa-good/40 text-sa-good hover:bg-sa-good/10 hover:text-sa-good" },
] as const;

export const SCORE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "Again", color: "text-sa-danger",        bg: "bg-sa-danger/5 border-sa-danger/30" },
    2: { label: "Hard",  color: "text-muted-foreground", bg: "bg-sa-surface border-sa-border" },
    3: { label: "Okay",  color: "text-muted-foreground", bg: "bg-sa-surface border-sa-border" },
    4: { label: "Good",  color: "text-foreground",       bg: "bg-sa-surface border-sa-border-strong" },
    5: { label: "Easy",  color: "text-sa-good",          bg: "bg-sa-good/5 border-sa-good/30" },
};
