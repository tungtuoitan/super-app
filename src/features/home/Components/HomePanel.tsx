/**
 * Home panel — TEMPORARY functional placeholder (TungRoot #1481).
 * The real UI comes from Claude Design (prompt: TungRoot document/tasks/1481-homepage-tien-bo/ui-prompt.md)
 * and must keep consuming only useHomeSelector / useHomeHelper / the headless hooks below.
 */

import { Eye, EyeOff, Lock, RefreshCw } from "lucide-react";
import { useHomeSelector } from "../selectors/useHome.selector";
import { useHomeHelper } from "../hooks/useHome.helper";
import { useHomeDataHeadless, useHomePrivacyHeadless } from "../hooks/useHome.headless";
import { HomeMasked } from "./small/HomeMasked";

const fmtMoney = (v: number | null) => (v === null ? "—" : `${Math.round(v).toLocaleString("vi-VN")} ₫`);
const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const cellText: Record<string, string> = { done: "●", note: "·", empty: "○", today: "◌", future: "" };

export function HomePanel() {
    useHomeDataHeadless();
    useHomePrivacyHeadless();
    const { activityView, kpis, dayColumns, dayRows, weekBars, timelineMarks, financeView, privacy, status } = useHomeSelector();
    const { togglePrivacy, extendFull, changeFullDuration, loadPublic } = useHomeHelper();
    const recentWeeks = activityView.weeks.slice(-8);
    const offset = activityView.weeks.length - recentWeeks.length;

    return (
        <div className="h-full overflow-auto p-6 space-y-6 text-sm">
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold flex-1">Tiến bộ · {status.todayKey}</h1>
                <span className="text-xs text-muted-foreground">
                    {status.isLoading ? "đang tải…" : status.loadedAt ? `cập nhật ${new Date(status.loadedAt).toLocaleTimeString("vi-VN")}` : ""}
                </span>
                <button className="p-1 rounded border" onClick={() => loadPublic()} title="Tải lại"><RefreshCw className="w-4 h-4" /></button>
                {privacy.mode === "full" && (
                    <>
                        <button className="px-2 py-1 rounded border" onClick={extendFull} title="Gia hạn">{fmtCountdown(privacy.remainingSeconds)}</button>
                        <select className="border rounded px-1 py-1" value={privacy.fullDurationMinutes} onChange={(e) => changeFullDuration(Number(e.target.value))}>
                            {privacy.durationOptions.map((m) => <option key={m} value={m}>{m} phút</option>)}
                        </select>
                    </>
                )}
                <button className="px-2 py-1 rounded border flex items-center gap-1" onClick={togglePrivacy} disabled={false}>
                    {privacy.isUnlocking ? <Lock className="w-4 h-4" /> : privacy.mode === "full" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {privacy.isUnlocking ? "Đang mở… (bấm để huỷ)" : privacy.mode === "full" ? "Về private" : "Xem đầy đủ"}
                </button>
            </div>
            {status.error && <div className="text-red-500">Lỗi: {status.error}</div>}

            <section className="grid grid-cols-5 gap-3">
                {kpis.map((k) => (
                    <div key={k.key} className="rounded border p-3">
                        <div className="text-xs text-muted-foreground">{k.label}</div>
                        {k.masked ? <HomeMasked /> : (
                            <div className="text-xl font-semibold">
                                {k.value}{k.target ? ` / ${k.target}` : k.limit !== null ? ` / ≤${k.limit}` : ""}
                                <span className="text-xs font-normal ml-2">{k.status}{k.weekdayCount ? ` · T2–T6: ${k.weekdayCount}` : ""}</span>
                            </div>
                        )}
                    </div>
                ))}
            </section>

            <section>
                <h2 className="font-semibold mb-2">Hoạt động (8 tuần gần nhất / {activityView.weeks.length} tuần)</h2>
                <table className="text-xs">
                    <thead><tr><th className="text-left pr-3">Nhóm</th>{recentWeeks.map((w) => <th key={w} className="px-1">{w.slice(5)}</th>)}<th className="pl-2">Tổng</th></tr></thead>
                    <tbody>
                        {activityView.groups.map((g) => (
                            <tr key={g.key} title={g.projects.map((p) => `${p.name}: ${p.total}`).join("\n")}>
                                <td className="pr-3">{g.label}</td>
                                {recentWeeks.map((w, i) => <td key={w} className="px-1 text-center">{g.counts[offset + i] || ""}</td>)}
                                <td className="pl-2">{g.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {timelineMarks.length > 0 && <div className="text-xs mt-1">Mốc: {timelineMarks.map((m) => m.date).join(", ")}</div>}
            </section>

            <section>
                <h2 className="font-semibold mb-2">14 ngày</h2>
                <table className="text-xs">
                    <thead><tr><th />{dayColumns.map((c) => <th key={c.date} className={`px-1 ${c.isToday ? "underline" : ""}`}>{c.date.slice(8)}</th>)}<th className="pl-2">Tuần</th></tr></thead>
                    <tbody>
                        {dayRows.map((r) => (
                            <tr key={r.key}>
                                <td className="pr-3">{r.label}</td>
                                {r.cells ? r.cells.map((c) => <td key={c.date} className="px-1 text-center" title={c.notes.join("\n")}>{cellText[c.state]}</td>)
                                    : <td colSpan={dayColumns.length}><HomeMasked /></td>}
                                <td className="pl-2">{r.weekSummary ?? ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section>
                <h2 className="font-semibold mb-2">Theo tuần (8 tuần gần nhất)</h2>
                {weekBars.map((b) => (
                    <div key={b.key} className="flex gap-2 items-center text-xs">
                        <span className="w-32">{b.label}</span>
                        {b.values ? b.values.slice(-8).map((v, i) => <span key={i} className="w-6 text-center">{v ?? "–"}</span>) : <HomeMasked />}
                    </div>
                ))}
            </section>

            <section>
                <h2 className="font-semibold mb-2">Tài chính</h2>
                {financeView.masked ? <HomeMasked /> : financeView.latest ? (
                    <div>
                        Tài sản ròng {financeView.latest.date}: {fmtMoney(financeView.latest.total)} · so với cuối tháng trước: {fmtMoney(financeView.changeVsPrevMonth)}
                        {" "}· đã đầu tư {fmtMoney(financeView.invested)}, lời/lỗ {fmtMoney(financeView.investPnl)} · {financeView.months.length} tháng dữ liệu
                    </div>
                ) : <div className="text-muted-foreground">Chưa có dữ liệu tài chính</div>}
            </section>
        </div>
    );
}
