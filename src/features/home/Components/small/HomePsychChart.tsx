import { Fragment, useState } from "react";
import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomePsychSelector } from "../../selectors/useHomePsych.selector";
import { weekdayLabel } from "../../utils/homeFormat.utils";
import type { CSSProperties } from "react";

const SHADES = ["rgba(142,166,200,.16)", "rgba(142,166,200,.4)", "rgba(142,166,200,.68)", "#a9c0de"];
const MUTED = "rgba(255,255,255,.55)";
const SUM: CSSProperties = { fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "flex-end", textAlign: "right", height: 36, whiteSpace: "nowrap" };

/** 14 days: mood/energy lines + one dot per answer, then one row per other daily question. */
export function HomePsychChart() {
    const psych = useHomePsychSelector();
    const { dayColumns } = useHomeSelector();
    const [tip, setTip] = useState<{ x: number; y: number; top: string; main: string } | null>(null);
    if (psych.masked) return null;

    const n = dayColumns.length;
    const colBg = (i: number) => (dayColumns[i].isToday ? "var(--home-today)" : dayColumns[i].isWeekend ? "var(--home-tint)" : "transparent");
    const topR = (i: number) => (dayColumns[i].isToday ? "10px 10px 0 0" : dayColumns[i].weekday === 6 ? "10px 0 0 0" : dayColumns[i].weekday === 7 ? "0 10px 0 0" : 0);
    const botR = (i: number) => (dayColumns[i].isToday ? "0 0 10px 10px" : dayColumns[i].weekday === 6 ? "0 0 0 10px" : dayColumns[i].weekday === 7 ? "0 0 10px 0" : 0);
    const dots = [
        ...psych.lines.flatMap((l) => l.dots.map((d) => ({ ...d, color: l.color, offset: l.offset, skip: false }))),
        ...psych.skipDots.map((d) => ({ ...d, color: "#2a2a2d", offset: 0, skip: true })),
    ];

    return (
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `118px repeat(${n},minmax(0,1fr)) 92px`, gridTemplateRows: "auto minmax(0,1fr) auto auto auto" }}>
            <div />
            {dayColumns.map((c, i) => (
                <div key={c.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", lineHeight: 1.2, background: colBg(i), borderRadius: topR(i), color: c.isToday ? "#fff" : "inherit" }}>
                    <span style={{ fontSize: 11, opacity: 0.55, whiteSpace: "nowrap" }}>{weekdayLabel(c.weekday)}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{parseInt(c.date.slice(8, 10), 10)}</span>
                </div>
            ))}
            <div className="home-muted" style={{ fontSize: 12, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", paddingBottom: 6 }}>7 ngày</div>

            <div style={{ position: "relative", minHeight: 0 }}>
                {psych.yLabels.map((y) => (
                    <span key={y.v} style={{ position: "absolute", left: 0, top: `${y.y}%`, transform: "translateY(-50%)", fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>{y.text}</span>
                ))}
            </div>
            <div style={{ gridColumn: `2 / ${n + 2}`, position: "relative", minHeight: 140 }} onMouseLeave={() => setTip(null)}>
                {dayColumns.map((c, i) => (colBg(i) === "transparent" ? null : (
                    <div key={c.date} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i / n) * 100}%`, width: `${100 / n}%`, background: colBg(i) }} />
                )))}
                {psych.gridYs.map((g) => (
                    <div key={g.y} style={{ position: "absolute", left: 0, right: 0, top: `${g.y}%`, borderTop: `1px solid rgba(255,255,255,${g.strong ? 0.07 : 0.035})` }} />
                ))}
                {psych.botIdx > 0 && (
                    <div className="home-muted" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${(psych.botIdx / n) * 100}%`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: "repeating-linear-gradient(135deg,rgba(255,255,255,.035) 0 2px,transparent 2px 9px)", borderRadius: 10, zIndex: 1 }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: "#161617" }}>{psych.botStartText}</span>
                    </div>
                )}
                <svg viewBox={`0 0 ${n * 100} 100`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", overflow: "visible", pointerEvents: "none" }}>
                    {psych.lines.map((l) => (
                        <Fragment key={l.id}>
                            <path d={l.dash} fill="none" stroke={l.color} strokeWidth={1.5} strokeDasharray="3 5" opacity={0.5} vectorEffect="non-scaling-stroke" />
                            <path d={l.solid} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" opacity={0.85} vectorEffect="non-scaling-stroke" />
                        </Fragment>
                    ))}
                </svg>
                {dots.map((d) => (
                    <div
                        key={d.key}
                        onMouseEnter={() => setTip({ x: d.x, y: d.y, top: d.tipTop, main: d.tipMain })}
                        style={{
                            position: "absolute", left: `${d.x}%`, top: `${d.y}%`, width: 9, height: 9, borderRadius: "50%", zIndex: 2,
                            background: d.color, boxShadow: d.skip ? "inset 0 0 0 1.5px rgba(255,255,255,.45)" : "0 0 0 2px #161617",
                            transform: `translate(calc(-50% + ${d.offset}px),-50%)`,
                        }}
                    />
                ))}
                {tip && (
                    <div className="home-tip" style={{ top: `${tip.y}%`, transform: "translateY(-50%)", ...(tip.x > 65 ? { right: `${100 - tip.x + 1.5}%` } : { left: `${tip.x + 1.5}%` }) }}>
                        <div className="home-muted" style={{ fontSize: 12 }}>{tip.top}</div>
                        <div style={{ fontWeight: 600 }}>{tip.main}</div>
                    </div>
                )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{psych.mood7}</span>
                <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: "#7fc4d6" }}>{psych.energy7}</span>
            </div>

            {psych.rows.map((r, ri) => {
                const last = ri === psych.rows.length - 1;
                const norm = (v: number) => (r.max === r.min ? 0 : (v - r.min) / (r.max - r.min));
                return (
                    <Fragment key={r.id}>
                        <div style={{ fontSize: 14, display: "flex", alignItems: "center", height: 36, whiteSpace: "nowrap" }}>{r.short}</div>
                        {r.cells.map((c, i) => {
                            const wrap: CSSProperties = { height: 36, display: "flex", alignItems: r.kind === "bar" ? "flex-end" : "center", justifyContent: "center", paddingBottom: r.kind === "bar" ? 7 : 0, background: colBg(i), borderRadius: last ? botR(i) : 0 };
                            let mark: CSSProperties = {};
                            if (c.state === "none") mark = { width: 10, height: 2, borderRadius: 1, background: "rgba(255,255,255,.14)" };
                            if (c.state === "value" && c.value !== null) {
                                mark = r.kind === "shade" ? { width: "calc(100% - 6px)", height: 22, borderRadius: 5, background: SHADES[Math.round(norm(c.value) * 3)] }
                                    : r.kind === "bar" ? { width: "calc(100% - 12px)", height: 4 + 18 * norm(c.value), borderRadius: 3, background: "rgba(230,230,230,.7)" }
                                    : c.value >= 0.5 ? { width: 12, height: 12, borderRadius: "50%", background: "#ededed" }
                                    : { width: 12, height: 12, borderRadius: "50%", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.4)" };
                            }
                            return <div key={c.date} title={c.title} style={wrap}><div style={mark} /></div>;
                        })}
                        <div style={r.collecting ? { ...SUM, fontSize: 12, fontWeight: 400, color: MUTED } : SUM}>{r.summary}</div>
                    </Fragment>
                );
            })}
        </div>
    );
}
