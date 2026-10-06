import { useState } from "react";
import { useHomeFinanceSelector } from "../../selectors/useHomeFinance.selector";

/**
 * Stacked net worth per account + total line (Claude Design v5). Reusable: `detail` adds the y grid,
 * the hover tooltip and the long mark label (Tài chính tab); the overview card uses the compact form.
 */
export function HomeNetWorthChart({ detail }: { detail: boolean }) {
    const fin = useHomeFinanceSelector();
    const [hover, setHover] = useState<number | null>(null);
    if (fin.state !== "full") return null;

    const p = hover !== null ? fin.points[hover] : null;
    return (
        <>
            <div
                style={detail ? { position: "relative", flex: 1, minHeight: 120, margin: "22px 64px 0 0" } : { position: "relative", flex: 1, minHeight: 50, marginTop: 14 }}
                onMouseMove={detail ? (e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - r.left) / r.width) * 100;
                    let best = 0;
                    fin.points.forEach((pt, i) => { if (Math.abs(pt.x - x) < Math.abs(fin.points[best].x - x)) best = i; });
                    if (best !== hover) setHover(best);
                } : undefined}
                onMouseLeave={detail ? () => setHover(null) : undefined}
            >
                {detail && fin.yGrid.map((g) => (
                    <div key={g.v}>
                        <div style={{ position: "absolute", left: 0, right: 0, top: `${g.y}%`, borderTop: `1px solid rgba(255,255,255,${g.v ? 0.06 : 0.14})` }} />
                        <span className="home-muted" style={{ position: "absolute", left: "calc(100% + 10px)", top: `${g.y}%`, transform: "translateY(-50%)", fontSize: 11, whiteSpace: "nowrap" }}>{g.label}</span>
                    </div>
                ))}
                <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", overflow: "visible", pointerEvents: "none" }}>
                    {fin.layers.map((l) => <path key={l.key} d={l.d} fill={l.color} />)}
                    <path d={fin.line} fill="none" stroke="#ededed" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                {fin.mark && (
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: `${fin.mark.x}%`, borderLeft: "1px dashed rgba(255,255,255,.55)", pointerEvents: "none" }}>
                        <span className="home-pill-mark" style={{ position: "absolute", top: 0, left: 6 }}>{detail ? fin.mark.text : fin.mark.short}</span>
                    </div>
                )}
                {p && (
                    <>
                        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${p.x}%`, width: 1, background: "rgba(255,255,255,.5)", pointerEvents: "none" }} />
                        <div className="home-tip" style={{ top: 8, ...(p.x > 60 ? { right: `${100 - p.x + 1}%` } : { left: `${p.x + 1}%` }) }}>
                            <div className="home-muted" style={{ fontSize: 12 }}>{p.top}</div>
                            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.main}</div>
                            {p.rows.map((r) => (
                                <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                    <span className="home-muted">{r.k}</span>
                                    <span>{r.v}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div style={{ position: "relative", height: detail ? 22 : 20, marginRight: detail ? 64 : 0 }}>
                {fin.ticks.map((t) => (
                    <span key={t.key} className="home-muted" style={{ position: "absolute", top: 4, fontSize: 12, whiteSpace: "nowrap", ...(t.x > 94 ? { right: 0 } : { left: `${t.x}%`, transform: "translateX(-50%)" }) }}>{t.label}</span>
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: detail ? "6px 22px" : "6px 18px", marginTop: detail ? 8 : 6 }}>
                {fin.legend.map((g) => (
                    <div key={g.key} title={g.full} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: detail ? 14 : 13 }}>
                        <span style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: g.color }} />
                        <span className="home-muted">{g.label}</span>
                        <span style={{ fontWeight: 600 }}>{g.value}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
