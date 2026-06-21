export const REVEAL_DELAY_MS = 3000;
export const SCORE_DELAY_MS = 3000;

// 1=Again(red) 2=Hard(orange) 3=Okay(yellow) 4=Good(green) 5=Easy(sky-blue)
export const BALL_BG: Record<number, string> = {
    1: "rgba(239,  68,  68, 0.82)",
    2: "rgba(249, 115,  22, 0.82)",
    3: "rgba(234, 179,   8, 0.82)",
    4: "rgba( 34, 197,  94, 0.82)",
    5: "rgba( 14, 165, 233, 0.82)",
};
export const RING_COLOR: Record<number, string> = {
    1: "rgba(239,  68,  68, 0.90)",
    2: "rgba(249, 115,  22, 0.90)",
    3: "rgba(234, 179,   8, 0.90)",
    4: "rgba( 34, 197,  94, 0.90)",
    5: "rgba( 14, 165, 233, 0.90)",
};
export const NEUTRAL_RING = "rgba(255,255,255,0.18)";
export const TEXT_COLOR: Record<number, string> = {
    1: "text-red-400",
    2: "text-orange-400",
    3: "text-yellow-400",
    4: "text-lime-400",
    5: "text-emerald-400",
};

export const SCORE_BUTTONS = [
    { score: 1, label: "Again", btnClass: "border-red-500/50    text-red-400    hover:bg-red-500/20" },
    { score: 2, label: "Hard",  btnClass: "border-orange-500/50 text-orange-400 hover:bg-orange-500/20" },
    { score: 3, label: "Okay",  btnClass: "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20" },
    { score: 4, label: "Good",  btnClass: "border-green-500/50  text-green-400  hover:bg-green-500/20" },
    { score: 5, label: "Easy",  btnClass: "border-sky-500/50    text-sky-400    hover:bg-sky-500/20" },
] as const;

export const SCORE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "Again", color: "text-red-400",    bg: "bg-red-500/10    border-red-500/30" },
    2: { label: "Hard",  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
    3: { label: "Okay",  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
    4: { label: "Good",  color: "text-green-400",  bg: "bg-green-500/10  border-green-500/30" },
    5: { label: "Easy",  color: "text-sky-400",    bg: "bg-sky-500/10    border-sky-500/30" },
};
