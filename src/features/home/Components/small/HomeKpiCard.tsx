import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomeStore } from "../../store/useHome.store";
import { weekdayLabel } from "../../utils/homeFormat.utils";
import { HomeHatch } from "./HomeHatch";
import type { CSSProperties } from "react";
import type { KpiStatus } from "../../types/home.types";

const STATUS: Record<KpiStatus, [string, string]> = {
    good: ["var(--home-good)", "Đạt"],
    onPace: ["var(--home-onpace)", "Đang kịp"],
    behind: ["var(--home-behind)", "Khó kịp"],
    over: ["var(--home-over)", "Vượt giới hạn"],
    neutral: ["var(--home-neutral)", "Ghi nhận"],
};
const SEG: CSSProperties = { height: 6, borderRadius: 3 };
const SEG_LABEL: CSSProperties = { fontSize: 10, color: "rgba(255,255,255,.4)", lineHeight: 1 };

/** One habit KPI card (rendered in a loop — looks itself up by key). */
export function HomeKpiCard({ kpiKey }: { kpiKey: string }) {
    const { kpis, dayRows, dayColumns } = useHomeSelector();
    const { privacyMode } = useHomeStore();
    const k = kpis.find((x) => x.key === kpiKey);
    if (!k) return null;

    if (k.masked) {
        return (
            <div className="home-card">
                <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.7)" }}>{k.label}</div>
                <div key={privacyMode} className="home-fx">
                    <HomeHatch style={{ width: "100%", maxWidth: 220, height: 42, marginTop: 4 }} />
                    <div style={{ width: "100%", maxWidth: 110, height: 12, marginTop: 12, borderRadius: 6, background: "rgba(255,255,255,.06)" }} />
                </div>
            </div>
        );
    }

    const isLimit = k.kind === "limit";
    const [statusColor, statusText] = STATUS[k.status];
    const color = isLimit && k.status !== "over" ? "var(--home-onpace)" : statusColor;
    const thisWeek = dayRows.find((r) => r.key === k.key)?.cells?.slice(-7) ?? [];
    const segs = k.kind === "daily"
        ? thisWeek.map((c, i) => {
            const col = dayColumns[dayColumns.length - 7 + i];
            const bar: CSSProperties = c.state === "done" ? { ...SEG, background: "#e6e6e6" }
                : c.state === "today" ? { ...SEG, border: "1px dashed rgba(255,255,255,.55)" }
                : c.state === "future" ? { ...SEG, border: "1px solid rgba(255,255,255,.08)" }
                : { ...SEG, background: "rgba(255,255,255,.12)" };
            return { key: c.date, bar, label: weekdayLabel(col?.weekday ?? i + 1), today: !!col?.isToday };
        })
        : k.kind === "count" && k.target
            ? Array.from({ length: k.target }, (_, i) => ({ key: String(i), bar: { ...SEG, background: i < (k.value ?? 0) ? "#e6e6e6" : "rgba(255,255,255,.12)" }, label: String(i + 1), today: false }))
            : [];

    return (
        <div className="home-card">
            <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.7)" }}>{k.label}</div>
            <div key={privacyMode} className="home-fx">
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, lineHeight: 1, marginTop: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 42, letterSpacing: "-0.02em" }}>{k.value}</span>
                    <span className="home-muted" style={{ fontSize: 20 }}>{isLimit ? `/ ≤${k.limit}` : k.target ? `/ ${k.target}` : ""}</span>
                </div>
                {segs.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 10, maxWidth: 260 }}>
                        {segs.map((s) => (
                            <div key={s.key} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                                <div style={s.bar} />
                                <span style={s.today ? { ...SEG_LABEL, color: "#ededed" } : SEG_LABEL}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 14, marginTop: 8 }}>
                    <span style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: color }} />
                    <span style={{ color }}>{isLimit ? (k.status === "over" ? "Vượt giới hạn" : "Trong giới hạn") : statusText}</span>
                    {isLimit && (k.weekdayCount ?? 0) > 0 && <span className="home-muted">· T2–T6: {k.weekdayCount}</span>}
                </div>
            </div>
        </div>
    );
}
