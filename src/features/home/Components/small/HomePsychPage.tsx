import { Minimize2 } from "lucide-react";
import { useHomePsychSelector } from "../../selectors/useHomePsych.selector";
import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomeStore } from "../../store/useHome.store";
import { useHomeHelper } from "../../hooks/useHome.helper";
import { fmtDayMonth } from "../../utils/homeFormat.utils";
import { HomeHatch } from "./HomeHatch";
import { HomePsychChart } from "./HomePsychChart";
import { HomePsychWeekly } from "./HomePsychWeekly";

/** "Tâm lý" tab (Claude Design v5): 14-day chart + rows, 12-week strips, response stats. */
export function HomePsychPage() {
    const psych = useHomePsychSelector();
    const { dayColumns } = useHomeSelector();
    const { privacyMode } = useHomeStore();
    const { showView } = useHomeHelper();
    const back = (
        <button type="button" className="home-icon-btn" onClick={() => showView("overview")} title="Về tổng quan" style={{ marginLeft: "auto" }}>
            <Minimize2 size={14} />
        </button>
    );

    if (psych.masked) {
        return (
            <section className="home-section" style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500 }}>Tâm lý</h2>
                    {back}
                </div>
                <div key={privacyMode} className="home-fx" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <HomeHatch radius={16} label="Riêng tư" style={{ flex: 1, minHeight: 100 }} />
                </div>
            </section>
        );
    }

    const first = dayColumns[0]?.date;
    const last = dayColumns[dayColumns.length - 1]?.date;
    return (
        <div key={privacyMode} className="home-fx" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12 }}>
                <section className="home-section" style={{ flex: "2.5 1 0", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 16px", marginBottom: 14 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 500 }}>
                            Tâm lý <span className="home-muted" style={{ fontWeight: 400 }}>· {first && fmtDayMonth(first)} – {last && fmtDayMonth(last)}</span>
                        </h2>
                        {psych.lines.map((l) => (
                            <span key={l.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
                                <span style={{ width: 16, height: 2, borderRadius: 1, background: l.color }} />{l.short}
                            </span>
                        ))}
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>đường = trung bình ngày · chấm = từng lần trả lời</span>
                        {psych.collecting && (
                            <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", fontSize: 12, color: "rgba(255,255,255,.75)" }}>{psych.collectText}</span>
                        )}
                        {back}
                    </div>
                    {psych.hasBank ? <HomePsychChart /> : (
                        <div className="home-muted" style={{ fontSize: 14 }}>Chưa đọc được bộ câu hỏi của tracker check-in.</div>
                    )}
                </section>

                <section className="home-section" style={{ flex: "1 1 0", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", height: 30, marginBottom: 14 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 500 }}>Theo tuần <span className="home-muted" style={{ fontWeight: 400 }}>· {psych.weekTicks.length} tuần</span></h2>
                    </div>
                    <HomePsychWeekly />
                </section>
            </div>

            <div style={{ flex: "none", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 20px", padding: "12px 18px", borderRadius: 16, border: "1px solid rgba(255,255,255,.06)", background: "#161617", fontSize: 14 }}>
                <span className="home-muted">Phản hồi · 14 ngày</span>
                <span><span style={{ fontWeight: 600 }}>{psych.stats.main}</span> <span style={{ color: "rgba(255,255,255,.7)" }}>{psych.stats.sub}</span></span>
                <span className="home-muted" style={{ fontSize: 13 }}>{psych.stats.detail}</span>
                <div className="home-muted" style={{ marginLeft: "auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 16px", fontSize: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2a2a2d", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.45)" }} />bỏ qua</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "flex", gap: 2 }}>
                            {["rgba(142,166,200,.16)", "rgba(142,166,200,.4)", "rgba(142,166,200,.68)", "#a9c0de"].map((c) => <span key={c} style={{ width: 10, height: 12, borderRadius: 3, background: c }} />)}
                        </span>
                        không → nặng
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ededed" }} />có
                        <span style={{ width: 10, height: 10, borderRadius: "50%", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.4)", marginLeft: 4 }} />không
                    </span>
                </div>
            </div>
        </div>
    );
}
