import { useHomeFinanceSelector } from "../../selectors/useHomeFinance.selector";
import { useHomeStore } from "../../store/useHome.store";
import { HomeExpandButton } from "./HomeExpandButton";
import { HomeHatch } from "./HomeHatch";
import { HomeNetWorthChart } from "./HomeNetWorthChart";

const UP = "#4ade80";
const DOWN = "#c9a48a";

/** Overview: net worth now, changes, savings rate and the compact chart. */
export function HomeFinanceCard() {
    const fin = useHomeFinanceSelector();
    const { privacyMode } = useHomeStore();

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 500 }}>Tài chính</h2>
                {fin.state === "full" && <span className="home-muted" style={{ fontSize: 13 }}>tài sản ròng · {fin.dateLabel}</span>}
                <HomeExpandButton target="fin" title="Mở tab Tài chính" />
            </div>
            <div key={privacyMode} className="home-fx" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {fin.state === "masked" && <HomeHatch radius={16} label="Riêng tư" style={{ flex: 1, minHeight: 100 }} />}
                {fin.state === "empty" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>Chưa có tài khoản nào</div>
                        <div className="home-muted" style={{ fontSize: 14 }}>Nối Binance hoặc BIDV (qua SePay) để bắt đầu theo dõi.</div>
                    </div>
                )}
                {fin.state === "full" && (
                    <>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "8px 24px" }}>
                            <div title={fin.totalFull} style={{ fontWeight: 500, fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em" }}>{fin.total}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 14, paddingBottom: 4 }}>
                                {fin.changes.map((c) => (
                                    <span key={c.label} title={c.full} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontWeight: 600, color: c.up ? UP : DOWN }}>{c.up ? "↑" : "↓"} {c.value}</span>
                                        <span className="home-muted">{c.label}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                        {fin.rate && (
                            <div className="home-muted" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, height: 30, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", fontSize: 14 }}>
                                Tỉ lệ tiết kiệm {fin.rate.month} <span style={{ color: "#ededed", fontWeight: 600 }}>{fin.rate.value}</span>
                            </div>
                        )}
                        <HomeNetWorthChart detail={false} />
                    </>
                )}
            </div>
        </>
    );
}
