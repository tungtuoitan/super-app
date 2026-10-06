import { useState } from "react";
import { useHomeActivitySelector } from "../../selectors/useHomeActivity.selector";
import { useHomeStore } from "../../store/useHome.store";
import { fmtDayMonth } from "../../utils/homeFormat.utils";
import { HomeExpandButton } from "./HomeExpandButton";

/** Streamgraph of notes per project group, 30 weeks (Claude Design v5). */
export function HomeActivitySection() {
    const { weeks, groups, N, layers, labels, monthTicks, marks } = useHomeActivitySelector();
    const { privacyMode } = useHomeStore();
    const [hoverGroup, setHoverGroup] = useState<string | null>(null);
    const [hoverWeek, setHoverWeek] = useState(0);

    const g = hoverGroup ? groups.find((x) => x.key === hoverGroup) : null;
    const tipX = ((hoverWeek + 0.5) / N) * 100;

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 500 }}>Hoạt động · {N} tuần</h2>
                <span className="home-muted" style={{ fontSize: 13 }}>đơn vị: số ghi chép (devlog, comment), không phải giờ</span>
                <HomeExpandButton target="act" />
            </div>
            <div
                style={{ position: "relative", flex: 1, minHeight: 100 }}
                onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const j = Math.min(N - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * N)));
                    if (j !== hoverWeek) setHoverWeek(j);
                }}
                onMouseLeave={() => setHoverGroup(null)}
            >
                <div style={{ position: "absolute", top: -8, bottom: 0, left: `${((N - 1) / N) * 100}%`, right: 0, borderRadius: 8, background: "rgba(255,255,255,.04)" }} />
                <div style={{ position: "absolute", top: -26, right: 0, fontSize: 12, color: "rgba(255,255,255,.5)" }}>tuần này ↓</div>
                <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
                    {layers.map((l) => (
                        <path
                            key={l.key}
                            d={l.d}
                            onMouseEnter={() => setHoverGroup(l.key)}
                            style={{ fill: `var(--home-group-${l.key})`, opacity: hoverGroup && hoverGroup !== l.key ? 0.14 : 1, transition: "opacity 150ms", cursor: "default" }}
                        />
                    ))}
                </svg>
                {labels.map((l) => (
                    <div
                        key={l.key}
                        style={l.chip
                            ? { position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6, padding: "2px 9px 2px 7px", borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", background: "#1f1f21", color: "#ededed", border: "1px solid rgba(255,255,255,.14)" }
                            : { position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translateY(-50%)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", color: `var(--home-group-${l.key}-ink)` }}
                    >
                        {l.chip && <span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: `var(--home-group-${l.key})` }} />}
                        {l.text}
                    </div>
                ))}
                {marks.map((m) => (
                    <div key={`${m.key}-${privacyMode}`} className="home-fx" title={m.title} style={{ position: "absolute", top: -8, bottom: 0, left: `calc(${m.x}% - 3px)`, width: 6 }}>
                        <div style={{ position: "absolute", top: 0, bottom: 0, left: 2, width: 2, borderRadius: 1, background: "var(--home-mark)", opacity: 0.8 }} />
                        <span className="home-pill-mark" style={{ position: "absolute", top: -16, ...(m.x > 60 ? { right: 4 } : { left: 4 }) }}>{m.short}</span>
                    </div>
                ))}
                {g && (
                    <div className="home-tip" style={{ top: 8, padding: "10px 14px", borderRadius: 14, ...(tipX > 60 ? { right: `${100 - tipX + 1}%` } : { left: `${tipX + 1}%` }) }}>
                        <div className="home-muted" style={{ fontSize: 12 }}>tuần {fmtDayMonth(weeks[hoverWeek])}</div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{g.label} · tuần {fmtDayMonth(weeks[hoverWeek])}: {g.counts[hoverWeek]} ghi chép</div>
                        {g.projects[0] && <div className="home-muted">Dự án nhiều nhất: {g.projects[0].name}</div>}
                    </div>
                )}
            </div>
            <div style={{ position: "relative", height: 22, marginTop: 8 }}>
                {monthTicks.map((t) => (
                    <span key={t.key} className="home-muted" style={{ position: "absolute", left: `${t.left}%`, top: 2, fontSize: 13, lineHeight: 1.2 }}>{t.label}</span>
                ))}
            </div>
        </>
    );
}
