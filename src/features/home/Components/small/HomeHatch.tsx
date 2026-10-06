import { Lock } from "lucide-react";
import type { CSSProperties } from "react";

/**
 * Private-mode placeholder: fixed hatched block + lock, never derived from data (Claude Design v5).
 * Reusable — size and label come from props.
 */
export function HomeHatch({ style, radius = 14, lockSize = 28, label }: { style?: CSSProperties; radius?: number; lockSize?: number; label?: string }) {
    return (
        <div className="home-hatch" style={{ borderRadius: radius, ...style }}>
            {label ? (
                <span style={{ position: "absolute", left: 10, top: 10, display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 14px 0 10px", borderRadius: 999, background: "#232325", color: "rgba(255,255,255,.55)", fontSize: 13 }}>
                    <Lock size={13} />
                    {label}
                </span>
            ) : (
                <span style={{ position: "absolute", left: Math.round(lockSize / 5), top: Math.round(lockSize / 7), display: "flex", alignItems: "center", justifyContent: "center", width: lockSize, height: lockSize, borderRadius: "50%", background: "#232325", color: "rgba(255,255,255,.55)" }}>
                    <Lock size={Math.round(lockSize / 2.2)} />
                </span>
            )}
        </div>
    );
}
