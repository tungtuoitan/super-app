import { Minimize2 } from "lucide-react";
import { useHomeFinanceSelector } from "../../selectors/useHomeFinance.selector";
import { useHomeStore } from "../../store/useHome.store";
import { useHomeHelper } from "../../hooks/useHome.helper";
import { HomeHatch } from "./HomeHatch";
import { HomeNetWorthChart } from "./HomeNetWorthChart";
import type { CSSProperties } from "react";

const UP = "#4ade80";
const DOWN = "#c9a48a";
const SOFT_UP = "#8ec5a8";
const LEGEND_DOT: CSSProperties = { width: 9, height: 9, borderRadius: 2 };

/** "Tài chính" tab: net worth, investment, top-5 allocation, 12-month cash flow (Claude Design v5). */
export function HomeFinancePage() {
    const fin = useHomeFinanceSelector();
    const { privacyMode } = useHomeStore();
    const { showView } = useHomeHelper();
    const back = (
        <button type="button" className="home-icon-btn" onClick={() => showView("overview")} title="Về tổng quan" style={{ marginLeft: "auto", alignSelf: "center" }}>
            <Minimize2 size={14} />
        </button>
    );

    if (fin.state !== "full") {
        return (
            <section className="home-section" style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500 }}>Tài chính</h2>
                    {back}
                </div>
                <div key={privacyMode} className="home-fx" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {fin.state === "masked" ? (
                        <HomeHatch radius={16} label="Riêng tư" style={{ flex: 1, minHeight: 100 }} />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                            <div style={{ fontSize: 22, fontWeight: 600 }}>Chưa có tài khoản nào</div>
                            <div className="home-muted" style={{ fontSize: 14 }}>Nối Binance hoặc BIDV (qua SePay) để bắt đầu theo dõi.</div>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    const { invest, alloc } = fin;
    return (
        <div key={privacyMode} className="home-fx" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1.75fr) minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) minmax(0,1fr) auto", gap: 12 }}>
            <section className="home-section" style={{ gridRow: "1 / 3", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500 }}>Tài sản ròng</h2>
                    <span className="home-muted" style={{ fontSize: 13 }}>{fin.sub}</span>
                    {back}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "8px 28px" }}>
                    <div title={fin.totalFull} style={{ fontWeight: 500, fontSize: 48, lineHeight: 1, letterSpacing: "-0.02em" }}>{fin.total}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 14, paddingBottom: 4 }}>
                        {fin.changes.map((c) => (
                            <span key={c.label} title={c.full} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 600, color: c.up ? UP : DOWN }}>{c.up ? "↑" : "↓"} {c.value}</span>
                                <span className="home-muted">{c.label}</span>
                            </span>
                        ))}
                    </div>
                    {fin.rate && (
                        <div className="home-muted" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4, height: 30, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", fontSize: 14 }}>
                            Tỉ lệ tiết kiệm {fin.rate.month} <span style={{ color: "#ededed", fontWeight: 600 }}>{fin.rate.value}</span>
                        </div>
                    )}
                </div>
                <HomeNetWorthChart detail />
            </section>

            <section className="home-section" style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500 }}>Đầu tư</h2>
                    <span className="home-muted" style={{ fontSize: 13 }}>{invest.sub}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className="home-muted" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#5a5a5e" }} />Đã bỏ vào</span>
                        <span title={invest.investedFull} style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}>{invest.invested}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className="home-muted" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f2b54b" }} />Đang đáng</span>
                        <span title={invest.currentFull} style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}>{invest.current}</span>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 18 }}>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.04)" }}><div style={{ width: `${invest.barA}%`, height: "100%", borderRadius: 4, background: "#5a5a5e" }} /></div>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.04)" }}><div style={{ width: `${invest.barB}%`, height: "100%", borderRadius: 4, background: "#f2b54b" }} /></div>
                </div>
                <div title={invest.pnlFull} style={{ fontSize: 14, marginTop: 14, color: invest.pnlUp ? SOFT_UP : DOWN }}>{invest.pnl}</div>
            </section>

            <section className="home-section" style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500 }}>Phân bổ tài sản</h2>
                    <span className="home-muted" style={{ fontSize: 13 }}>top 5</span>
                </div>
                <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 5, overflow: "hidden", flex: "none" }}>
                    {alloc.segs.map((s) => <div key={s.key} title={s.title} style={{ flex: `${s.flex} 1 0`, background: s.color }} />)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 10, minHeight: 0 }}>
                    {alloc.rows.map((h) => (
                        <div key={h.key} style={{ display: "grid", gridTemplateColumns: "10px minmax(0,1fr) auto 40px", alignItems: "center", gap: 10, minHeight: 30, fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                            <span style={h.color ? { width: 10, height: 10, borderRadius: 3, background: h.color } : { width: 10, height: 10, borderRadius: 3, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.3)" }} />
                            <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <span style={{ fontWeight: 600 }}>{h.asset}</span> <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{h.meta}</span>
                            </span>
                            <span title={h.full} style={h.priced ? { fontWeight: 600, whiteSpace: "nowrap" } : { fontSize: 13, color: "rgba(255,255,255,.55)", whiteSpace: "nowrap" }}>{h.value}</span>
                            <span className="home-muted" style={{ textAlign: "right", fontSize: 13 }}>{h.share}</span>
                        </div>
                    ))}
                </div>
                {alloc.missing && <div className="home-muted" style={{ fontSize: 12, marginTop: 10 }}>{alloc.missing}</div>}
            </section>

            <section className="home-section" style={{ gridColumn: "1 / 3", minWidth: 0, padding: "14px 18px", overflow: "visible" }}>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 16px", marginBottom: 10 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500 }}>Dòng tiền · 12 tháng</h2>
                    {fin.cfHas && (
                        <>
                            <span className="home-muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ ...LEGEND_DOT, background: "#e6e6e6" }} />thu</span>
                            <span className="home-muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ ...LEGEND_DOT, background: "#808085" }} />chi tiêu</span>
                            <span className="home-muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ ...LEGEND_DOT, background: "#f2b54b" }} />đầu tư (không tính là chi)</span>
                            <span className="home-muted" style={{ fontSize: 12 }}>% = tỉ lệ tiết kiệm</span>
                            <span className="home-muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.7)" }} />giao dịch chưa phân loại</span>
                        </>
                    )}
                </div>
                {fin.cfHas ? (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(fin.cashflow.length, 1)},minmax(0,1fr))`, gap: "0 14px", height: 138 }}>
                        {fin.cashflow.map((m) => (
                            <div key={m.key} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", height: 16 }}>{m.rate}</div>
                                <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 3, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                                    <div title={m.incT} style={{ flex: "1 1 0", maxWidth: 18, height: `${m.inc}%`, background: "#e6e6e6", borderRadius: "3px 3px 0 0" }} />
                                    <div title={m.expT} style={{ flex: "1 1 0", maxWidth: 18, height: `${m.exp}%`, background: "#808085", borderRadius: "3px 3px 0 0" }} />
                                    <div title={m.invT} style={{ flex: "1 1 0", maxWidth: 18, height: `${m.inv}%`, background: "#f2b54b", borderRadius: "3px 3px 0 0" }} />
                                </div>
                                <div className="home-muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 6, whiteSpace: "nowrap" }}>
                                    <span>{m.label}</span>
                                    {m.unc > 0 && (
                                        <span title={`${m.unc} giao dịch chưa phân loại`} style={{ display: "flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,.7)" }}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.7)" }} />{m.unc}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", fontSize: 14 }}>
                        <span style={{ fontWeight: 600 }}>Chưa có dữ liệu thu chi</span>
                        <span className="home-muted">nối BIDV qua SePay để thấy thu, chi và tỉ lệ tiết kiệm theo tháng.</span>
                    </div>
                )}
            </section>
        </div>
    );
}
