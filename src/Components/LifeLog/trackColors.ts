export interface TrackColor {
    name: string;
    hex: string;
}

export const TRACK_COLORS: TrackColor[] = [
    { name: "Red",     hex: "#ef4444" },
    { name: "Orange",  hex: "#f97316" },
    { name: "Amber",   hex: "#f59e0b" },
    { name: "Pink",    hex: "#ec4899" },
    { name: "Violet",  hex: "#8b5cf6" },
    { name: "Sky",     hex: "#0ea5e9" },
    { name: "Emerald", hex: "#10b981" },
];

/** Returns the hex for a track, falling back to palette by index */
export function resolveTrackColor(color: string | undefined | null, fallbackIndex: number): string {
    if (color) return color;
    return TRACK_COLORS[fallbackIndex % TRACK_COLORS.length].hex;
}
