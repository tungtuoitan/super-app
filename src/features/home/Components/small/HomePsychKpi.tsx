import { ArrowUpRight } from "lucide-react";
import { useHomePsychSelector } from "../../selectors/useHomePsych.selector";
import { useHomeStore } from "../../store/useHome.store";
import { useHomeHelper } from "../../hooks/useHome.helper";
import { HomeHatch } from "./HomeHatch";

/** "Tâm lý" card in the KPI row: 7-day mood + energy with a 14-day sparkline; opens the Tâm lý tab. */
export function HomePsychKpi() {
    const psych = useHomePsychSelector();
    const { privacyMode } = useHomeStore();
    const { showView } = useHomeHelper();

    if (psych.masked) {
        return (
            <div className="home-card">
                <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.7)" }}>Tâm lý</div>
                <div key={privacyMode} className="home-fx">
                    <HomeHatch style={{ width: "100%", maxWidth: 220, height: 42, marginTop: 4 }} />
                    <div style={{ width: "100%", maxWidth: 110, height: 12, marginTop: 12, borderRadius: 6, background: "rgba(255,255,255,.06)" }} />
                </div>
            </div>
        );
    }

    const { kpi } = psych;
    return (
        <button type="button" className="home-card home-card-link" onClick={() => showView("psy")} title="Mở tab Tâm lý">
            <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.7)" }}>
                Tâm lý
                <ArrowUpRight size={14} style={{ marginLeft: "auto" }} />
            </div>
            <div key={privacyMode} className="home-fx" style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                {kpi.collecting ? (
                    <>
                        <div style={{ fontSize: 24, fontWeight: 500, marginTop: 12 }}>Đang thu thập</div>
                        <div className="home-muted" style={{ fontSize: 14, marginTop: 8 }}>{kpi.collectText}</div>
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, lineHeight: 1, marginTop: 6 }}>
                            <span style={{ fontWeight: 500, fontSize: 42, letterSpacing: "-0.02em" }}>{kpi.mood?.text ?? "—"}</span>
                            <span className="home-muted" style={{ fontSize: 20 }}>{kpi.mood ? `· ${kpi.mood.label}` : ""}</span>
                        </div>
                        <div style={{ position: "relative", height: 22, marginTop: 10, maxWidth: 260 }}>
                            {kpi.spark && (
                                <svg viewBox="0 0 1400 40" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
                                    <line x1={0} x2={1400} y1={kpi.sparkMid} y2={kpi.sparkMid} stroke="rgba(255,255,255,.08)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                    <path d={kpi.spark.dash} fill="none" stroke="#ededed" strokeWidth={1.5} strokeDasharray="2 4" opacity={0.5} vectorEffect="non-scaling-stroke" />
                                    <path d={kpi.spark.solid} fill="none" stroke="#ededed" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    <path d={kpi.spark.dots} fill="none" stroke="#ededed" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                </svg>
                            )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 14, marginTop: 8 }}>
                            <span style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: "#7fc4d6" }} />
                            <span className="home-muted">{kpi.energyShort}</span>
                            <span style={{ fontWeight: 600 }}>{kpi.energy?.text ?? "—"}</span>
                            <span className="home-muted">{kpi.energy ? `· ${kpi.energy.label}` : ""}</span>
                        </div>
                    </>
                )}
            </div>
        </button>
    );
}
