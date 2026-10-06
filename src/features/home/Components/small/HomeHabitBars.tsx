import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomeActivitySelector } from "../../selectors/useHomeActivity.selector";
import { useHomeStore } from "../../store/useHome.store";
import { fmtDayMonth } from "../../utils/homeFormat.utils";
import { HomeExpandButton } from "./HomeExpandButton";
import { HomeHatch } from "./HomeHatch";
import type { CSSProperties } from "react";

/** Weekly bars per habit, same 30-week axis as the streamgraph; dashed = target, solid = limit. */
export function HomeHabitBars() {
    const { weekBars, activityView } = useHomeSelector();
    const { marks } = useHomeActivitySelector();
    const { privacyMode } = useHomeStore();
    const weeks = activityView.weeks;
    const N = weeks.length;

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 500 }}>Thói quen theo tuần</h2>
                <span className="home-muted" style={{ fontSize: 13 }}>nét đứt = mục tiêu · nét liền = giới hạn</span>
                <HomeExpandButton target="hab" />
            </div>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
                {weekBars.map((r) => {
                    const fx = { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } as CSSProperties;
                    if (r.masked || !r.values) {
                        return (
                            <div key={r.key} style={{ flex: "1 1 0", minHeight: 44, display: "flex", flexDirection: "column" }}>
                                <div style={{ fontSize: 15, marginBottom: 5, fontWeight: 600 }}>{r.label}</div>
                                <div key={privacyMode} className="home-fx" style={fx}>
                                    <HomeHatch radius={10} lockSize={28} style={{ flex: 1, minHeight: 14, maxHeight: 150 }} />
                                </div>
                            </div>
                        );
                    }
                    const values = r.values;
                    const line = r.target ?? r.limit;
                    const max = Math.max(line ?? 0, 1, ...values.filter((x): x is number => x !== null)) * 1.1;
                    const nulls = values.findIndex((x) => x !== null);
                    const leading = nulls < 0 ? N : nulls;
                    const current = values[values.length - 1] ?? 0;
                    const meta = r.kind === "limit" ? `tuần này ${current} · giới hạn ${r.limit}` : r.target ? `tuần này ${current} · mục tiêu ${r.target}` : `tuần này ${current}`;
                    return (
                        <div key={r.key} style={{ flex: "1 1 0", minHeight: 44, display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 15, marginBottom: 5 }}>
                                <span style={{ fontWeight: 600 }}>{r.label}</span>
                                <span className="home-muted" style={{ fontSize: 13 }}>{meta}</span>
                            </div>
                            <div key={privacyMode} className="home-fx" style={fx}>
                                <div style={{ position: "relative", flex: 1, minHeight: 14, maxHeight: 150, display: "flex", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                                    {values.map((v, j) => {
                                        const cur = j === N - 1;
                                        const base: CSSProperties = {
                                            flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 2px",
                                            background: v === null ? "rgba(255,255,255,.03)" : cur ? "rgba(255,255,255,.05)" : "transparent", borderRadius: cur ? "6px 6px 0 0" : 0,
                                        };
                                        if (v === null) return <div key={weeks[j]} style={base} title={`Tuần ${fmtDayMonth(weeks[j])}: chưa theo dõi`} />;
                                        if (r.kind === "limit") {
                                            const wd = r.weekdayValues?.[j] ?? 0;
                                            return (
                                                <div key={weeks[j]} style={base} title={`Tuần ${fmtDayMonth(weeks[j])}: ${v} (T2–T6: ${wd})`}>
                                                    <div style={{ height: `${((v - wd) / max) * 100}%`, background: "var(--home-bar-soft)", borderRadius: "3px 3px 0 0" }} />
                                                    <div style={{ height: `${(wd / max) * 100}%`, background: "var(--home-bar)", borderRadius: v - wd ? 0 : "3px 3px 0 0" }} />
                                                </div>
                                            );
                                        }
                                        const met = !!r.target && v >= r.target;
                                        return (
                                            <div key={weeks[j]} style={base} title={`Tuần ${fmtDayMonth(weeks[j])}: ${v}${r.target ? `/${r.target}` : ""}`}>
                                                <div style={{ height: `${Math.max((v / max) * 100, v === 0 ? 0 : 3)}%`, borderRadius: "3px 3px 0 0", background: met ? "var(--home-bar-met)" : "var(--home-bar)" }} />
                                            </div>
                                        );
                                    })}
                                    {leading > 0 && (
                                        <div className="home-muted" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(leading / N) * 100}%`, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", pointerEvents: "none" }}>
                                            chưa theo dõi
                                        </div>
                                    )}
                                    {line !== null && leading < N && (
                                        <div style={{ position: "absolute", left: `${(leading / N) * 100}%`, right: 0, bottom: `${(line / max) * 100}%`, height: 0, borderTop: r.target ? "2px dashed var(--home-good)" : "2px solid var(--home-neutral)", pointerEvents: "none" }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {marks.map((m) => (
                    <div key={`${m.key}-${privacyMode}`} className="home-fx" title={m.title} style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${m.x}% - 1px)`, width: 2, borderRadius: 1, background: "var(--home-mark)", opacity: 0.5 }} />
                ))}
            </div>
        </>
    );
}
