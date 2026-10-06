import { Eye, EyeOff, Loader2, RefreshCw, Timer } from "lucide-react";
import { homeConstants } from "../../home.constants";
import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomeHelper } from "../../hooks/useHome.helper";
import { weekStartKey } from "../../utils/home.utils";
import { fmtCountdown, fmtDayMonth } from "../../utils/homeFormat.utils";

const WARN_SECONDS = 30;

/** Title + refresh, tabs, privacy controls (unlock / countdown / duration / back to private). */
export function HomeHeader() {
    const { privacy, status, view } = useHomeSelector();
    const { loadPublic, togglePrivacy, extendFull, changeFullDuration, showView } = useHomeHelper();
    const isFull = privacy.mode === "full";
    const warn = privacy.remainingSeconds <= WARN_SECONDS;
    const updated = status.loadedAt ? new Date(status.loadedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

    return (
        <header style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px 20px", minHeight: 52, flex: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: "auto" }}>
                <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
                    Tiến bộ <span style={{ color: "rgba(255,255,255,.5)" }}>· tuần {fmtDayMonth(weekStartKey(status.todayKey))}</span>
                </h1>
                <div className="home-muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    cập nhật lúc {updated}
                    <button type="button" className="home-ghost-btn" title="Tải lại" onClick={() => loadPublic()}>
                        <RefreshCw size={14} className={status.isLoading ? "home-spin" : undefined} />
                    </button>
                </div>
            </div>

            <nav style={{ display: "flex", gap: 2, padding: 4, borderRadius: 999, background: "#161617", border: "1px solid rgba(255,255,255,.06)" }}>
                {homeConstants.views.map((t, i) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => showView(t.key)}
                        title={`Phím ${i + 1}`}
                        style={{
                            height: 32, padding: "0 14px", border: 0, borderRadius: 999, font: "inherit", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                            background: view === t.key ? "#f2f2f2" : "transparent",
                            color: view === t.key ? "#111" : "rgba(255,255,255,.6)",
                            fontWeight: view === t.key ? 500 : 400,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
                {!isFull && !privacy.isUnlocking && (
                    <button type="button" className="home-btn home-btn-light" onClick={togglePrivacy}>
                        <Eye size={18} />
                        Xem đầy đủ
                    </button>
                )}
                {privacy.isUnlocking && (
                    <button type="button" className="home-btn home-btn-outline" onClick={togglePrivacy} style={{ fontSize: 16 }}>
                        <Loader2 size={18} className="home-spin" />
                        Đang mở… bấm để huỷ
                    </button>
                )}
                {isFull && (
                    <>
                        <button
                            type="button"
                            onClick={extendFull}
                            title="Bấm để gia hạn"
                            className={warn ? "home-btn home-btn-light" : "home-btn home-btn-timer"}
                            style={{ padding: "0 18px 0 8px" }}
                        >
                            <span style={{ width: 30, height: 30, borderRadius: "50%", background: warn ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Timer size={15} />
                            </span>
                            <span style={{ fontSize: 22, fontWeight: warn ? 700 : 600, minWidth: 52, textAlign: "left" }}>{fmtCountdown(privacy.remainingSeconds)}</span>
                        </button>
                        <div style={{ display: "flex", gap: 6 }} title="Thời lượng xem đầy đủ">
                            {privacy.durationOptions.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => changeFullDuration(m)}
                                    style={{
                                        height: 40, padding: "0 14px", borderRadius: 999, font: "inherit", fontSize: 15, cursor: "pointer",
                                        ...(privacy.fullDurationMinutes === m
                                            ? { border: "1px solid transparent", background: "#f2f2f2", color: "#111" }
                                            : { border: "1px solid rgba(255,255,255,.14)", background: "transparent", color: "#ededed" }),
                                    }}
                                >
                                    {m} phút
                                </button>
                            ))}
                        </div>
                        <button type="button" className="home-btn home-btn-outline" onClick={togglePrivacy} title="Về private" style={{ gap: 8, padding: "0 18px" }}>
                            <EyeOff size={17} />
                            Về private
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
