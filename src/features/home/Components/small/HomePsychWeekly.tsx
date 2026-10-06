import { useHomePsychSelector } from "../../selectors/useHomePsych.selector";
import type { CSSProperties } from "react";

const SHADES = ["rgba(142,166,200,.16)", "rgba(142,166,200,.4)", "rgba(142,166,200,.68)", "#a9c0de"];

/** Weekly psych questions: one strip of 12 weeks each. */
export function HomePsychWeekly() {
    const psych = useHomePsychSelector();
    if (psych.masked) return null;

    return (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 22 }}>
            {psych.weekly.map((w) => (
                <div key={w.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 10px" }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{w.short}</span>
                        <span className="home-muted" style={{ fontSize: 13 }}>{w.latest}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{w.text}</div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${w.cells.length},minmax(0,1fr))`, gap: 4 }}>
                        {w.cells.map((c) => {
                            const base: CSSProperties = { height: 26, borderRadius: 5 };
                            const style: CSSProperties = c.value === null
                                ? (c.current ? { ...base, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.35)" } : { ...base, background: "rgba(255,255,255,.04)" })
                                : w.type === "yesno"
                                    ? (c.value >= 0.5 ? { ...base, background: "rgba(237,237,237,.85)" } : { ...base, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.35)" })
                                    : { ...base, background: SHADES[Math.min(3, Math.max(0, Math.round(c.value)))] };
                            return <div key={c.key} title={c.title} style={style} />;
                        })}
                    </div>
                    {w.collecting && <span className="home-muted" style={{ fontSize: 12 }}>đang thu thập · {w.n} câu trả lời</span>}
                </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${psych.weekTicks.length},minmax(0,1fr))`, gap: 4, fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: -12 }}>
                {psych.weekTicks.map((t, i) => <span key={i} style={{ whiteSpace: "nowrap" }}>{t}</span>)}
            </div>
        </div>
    );
}
