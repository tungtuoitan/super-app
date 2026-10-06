/**
 * Home — progress dashboard (TungRoot #1481), UI from Claude Design "Home Tien Bo v5".
 * Tabs: overview + one tab per section (keys 1–6). Data only via useHomeSelector & co.
 */

import { AlertTriangle } from "lucide-react";
import "./home.css";
import { homeConstants } from "../home.constants";
import { useHomeSelector } from "../selectors/useHome.selector";
import { useHomeHelper } from "../hooks/useHome.helper";
import { useHomeDataHeadless, useHomeFitHeadless, useHomePrivacyHeadless, useHomeTotpHeadless, useHomeViewKeysHeadless } from "../hooks/useHome.headless";
import { HomeHeader } from "./small/HomeHeader";
import { HomeKpiRow } from "./small/HomeKpiRow";
import { HomeActivitySection } from "./small/HomeActivitySection";
import { HomeHabitBars } from "./small/HomeHabitBars";
import { HomeDayGrid } from "./small/HomeDayGrid";
import { HomeFinanceCard } from "./small/HomeFinanceCard";
import { HomePsychPage } from "./small/HomePsychPage";
import { HomeFinancePage } from "./small/HomeFinancePage";
import { HomeTotpDialog } from "./small/HomeTotpDialog";
import type { CSSProperties } from "react";

const SKELETON: CSSProperties = { borderRadius: 16, background: "#161617", border: "1px solid rgba(255,255,255,.06)" };
const BAR = (width: string, height: number): CSSProperties => ({ width, height, borderRadius: height / 2, background: "rgba(255,255,255,.06)" });

export function HomePanel() {
    useHomeDataHeadless();
    useHomePrivacyHeadless();
    useHomeViewKeysHeadless();
    useHomeFitHeadless();
    useHomeTotpHeadless();
    const { status, view } = useHomeSelector();
    const { loadPublic } = useHomeHelper();

    const ov = view === "overview";
    const show = (k: string) => ov || view === k;
    const sec = (flex: string): CSSProperties => ({ flex });
    const firstLoad = status.isLoading && !status.loadedAt;
    const loadedAt = status.loadedAt ? new Date(status.loadedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null;

    return (
        <div id={homeConstants.rootId} style={{ width: "100%", height: "100%" }}>
            <HomeHeader />

            {status.error && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", fontSize: 14, borderRadius: 999, background: "rgba(240,165,138,.1)", border: "1px solid rgba(240,165,138,.3)", color: "#f0a58a" }}>
                    <AlertTriangle size={15} />
                    <span>Không tải được dữ liệu mới.{loadedAt ? ` Đang hiển thị dữ liệu lúc ${loadedAt}.` : ""}</span>
                    <button type="button" className="home-btn-err" onClick={() => loadPublic()}>Thử lại</button>
                </div>
            )}

            {firstLoad ? (
                <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} style={{ ...SKELETON, flex: "1 1 200px", minHeight: 130, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={BAR("45%", 14)} />
                                <div style={{ ...BAR("60%", 56), borderRadius: 12 }} />
                                <div style={BAR("35%", 12)} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, flex: 1 }}>
                        <div style={{ ...SKELETON, flex: "999 1 640px", minHeight: 0 }} />
                        <div style={{ ...SKELETON, flex: "1 1 460px", minHeight: 0 }} />
                    </div>
                </>
            ) : (
                <>
                    {ov && <HomeKpiRow />}

                    {["overview", "act", "hab", "day"].includes(view) && (
                        <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
                            {(show("act") || show("hab")) && (
                                <div style={{ flex: ov ? "1.6 1 0" : "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                                    {show("act") && <section className="home-section" style={sec(ov ? "1.3 1 0" : "1 1 0")}><HomeActivitySection /></section>}
                                    {show("hab") && <section className="home-section" style={sec(ov ? "0 0 auto" : "1 1 0")}><HomeHabitBars /></section>}
                                </div>
                            )}
                            {show("day") && (
                                <div style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                                    <section className="home-section" style={sec(ov ? "0 0 auto" : "1 1 0")}><HomeDayGrid /></section>
                                    {ov && <section className="home-section" style={sec("1 1 0")}><HomeFinanceCard /></section>}
                                </div>
                            )}
                        </div>
                    )}

                    {view === "psy" && <HomePsychPage />}
                    {view === "fin" && <HomeFinancePage />}
                </>
            )}

            <HomeTotpDialog />
        </div>
    );
}
