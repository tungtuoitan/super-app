import { Fragment } from "react";
import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomeStore } from "../../store/useHome.store";
import { fmtDayMonth, weekdayLabel } from "../../utils/homeFormat.utils";
import { HomeExpandButton } from "./HomeExpandButton";
import { HomeHatch } from "./HomeHatch";
import type { CSSProperties } from "react";
import type { DayCellState } from "../../types/home.types";

const STATE_TITLE: Record<DayCellState, string> = { done: "Có làm", note: "Có ghi chú", empty: "Không có ghi nhận", today: "Hôm nay", future: "" };

/** Previous + current week, one row per habit (Claude Design v5). Taller rows in the "14 ngày" tab. */
export function HomeDayGrid() {
    const { dayColumns, dayRows, kpis } = useHomeSelector();
    const { view, privacyMode } = useHomeStore();
    const rowH = view === "day" ? 72 : 32;
    const lastRow = dayRows.length - 1;
    const kindOf = (key: string) => kpis.find((k) => k.key === key)?.kind;
    const colBg = (i: number) => (dayColumns[i].isToday ? "var(--home-today)" : dayColumns[i].isWeekend ? "var(--home-tint)" : "transparent");
    const first = dayColumns[0]?.date;
    const last = dayColumns[dayColumns.length - 1]?.date;

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 500 }}>
                    {dayColumns.length} ngày <span className="home-muted" style={{ fontWeight: 400 }}>· {first && fmtDayMonth(first)} – {last && fmtDayMonth(last)}</span>
                </h2>
                <HomeExpandButton target="day" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `118px repeat(${dayColumns.length},minmax(0,1fr)) 46px`, alignItems: "stretch" }}>
                <div />
                {dayColumns.map((c, i) => (
                    <div
                        key={c.date}
                        style={{
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", lineHeight: 1.2,
                            background: colBg(i), color: c.isToday ? "#fff" : "inherit", marginLeft: i === 7 ? 6 : 0,
                            borderRadius: c.isToday ? "10px 10px 0 0" : c.weekday === 6 ? "10px 0 0 0" : c.weekday === 7 ? "0 10px 0 0" : 0,
                        }}
                    >
                        <span style={{ fontSize: 11, opacity: 0.55, whiteSpace: "nowrap" }}>{weekdayLabel(c.weekday)}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{parseInt(c.date.slice(8, 10), 10)}</span>
                    </div>
                ))}
                <div className="home-muted" style={{ fontSize: 12, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", paddingBottom: 6 }}>tuần</div>

                {dayRows.map((r, ri) => (
                    <Fragment key={r.key}>
                        <div style={{ fontSize: view === "day" ? 16 : 14, display: "flex", alignItems: "center", height: rowH, paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                        {r.masked || !r.cells ? (
                            <div style={{ gridColumn: "2 / -1", height: rowH, padding: "7px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <div key={privacyMode} className="home-fx">
                                    <HomeHatch radius={8} lockSize={22} style={{ height: 28 }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                {r.cells.map((c, i) => {
                                    const col = dayColumns[i];
                                    const bar: CSSProperties = { width: "calc(100% - 4px)", height: rowH - 18, borderRadius: 5, flex: "none" };
                                    const fill = kindOf(r.key) === "limit" ? "var(--home-over)" : "#e6e6e6";
                                    const mark: CSSProperties = c.state === "done" ? { ...bar, background: fill }
                                        : c.state === "note" ? { ...bar, background: "rgba(255,255,255,.26)" }
                                        : c.state === "empty" ? { ...bar, background: "rgba(255,255,255,.06)" }
                                        : c.state === "today" ? { ...bar, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.55)" }
                                        : { ...bar, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)" };
                                    const lastCorner = ri === lastRow && (col.isToday || col.isWeekend)
                                        ? { borderRadius: col.isToday ? "0 0 10px 10px" : col.weekday === 6 ? "0 0 0 10px" : "0 0 10px 0" }
                                        : {};
                                    return (
                                        <div
                                            key={c.date}
                                            title={c.notes.join(" · ") || STATE_TITLE[c.state]}
                                            style={{ height: rowH, display: "flex", alignItems: "center", justifyContent: "center", background: colBg(i), marginLeft: i === 7 ? 6 : 0, ...lastCorner }}
                                        >
                                            <div key={privacyMode} className="home-fx" style={mark} />
                                        </div>
                                    );
                                })}
                                <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{r.weekSummary}</div>
                            </>
                        )}
                    </Fragment>
                ))}
            </div>
            <span className="home-muted" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, marginTop: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 12, borderRadius: 3, background: "#e6e6e6" }} />có làm</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 12, borderRadius: 3, background: "rgba(255,255,255,.26)" }} />ghi chú</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 12, borderRadius: 3, background: "rgba(255,255,255,.06)" }} />không ghi nhận</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 12, borderRadius: 3, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.55)" }} />hôm nay</span>
            </span>
        </>
    );
}
