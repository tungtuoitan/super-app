import { useMemo } from "react";
import { useHomeSelector } from "./useHome.selector";
import { DEBT_KEY, financeChart, layerValue } from "../utils/homeChart.utils";
import { addMonths, monthKey } from "../utils/home.utils";
import { fmt1, fmtDayMonth, fmtVndFull, fmtVndShort } from "../utils/homeFormat.utils";

const LEGEND_ORDER = ["BIDV", "Binance"];
const ALLOC_COLORS = ["#f2b54b", "#d19a42", "#a97d38", "#80612e", "#5e4a28"];
const CASH_COLOR = "#8a8a90";

/**
 * Tài chính (Claude Design v5) from the #1482 ledger summary: net-worth stack per account, changes,
 * investment vs value, top-5 allocation and 12-month cash flow. `state`: masked | empty | full.
 */
export const useHomeFinanceSelector = () => {
    const { financeView } = useHomeSelector();

    return useMemo(() => {
        if (financeView.masked) return { state: "masked" as const };
        const S = financeView.series;
        const latest = financeView.latest;
        if (!S.length || !latest) return { state: "empty" as const };

        const chart = financeChart(S);
        const layers = chart.layers;
        const ordered = [...layers].sort((a, b) => {
            const ia = a.key === DEBT_KEY ? 99 : LEGEND_ORDER.indexOf(a.key) < 0 ? 50 : LEGEND_ORDER.indexOf(a.key);
            const ib = b.key === DEBT_KEY ? 99 : LEGEND_ORDER.indexOf(b.key) < 0 ? 50 : LEGEND_ORDER.indexOf(b.key);
            return ia - ib;
        });
        const legend = ordered.map((l) => ({ key: l.key, label: l.label, color: l.color, value: fmtVndShort(layerValue(latest, l.key)), full: fmtVndFull(layerValue(latest, l.key)) }));
        const lateStart = layers.find((l) => l.key !== DEBT_KEY && l.start > 0);
        const mark = lateStart
            ? { x: chart.X(S[lateStart.start].date) / 10, short: `bắt đầu theo dõi ${lateStart.label}`, text: `bắt đầu theo dõi ${lateStart.label} · ${S[lateStart.start].date.slice(5, 7)}/${S[lateStart.start].date.slice(0, 4)}` }
            : null;

        const prevMonth = parseInt(addMonths(monthKey(latest.date), -1).slice(5, 7), 10);
        const changes = ([[financeView.changeVsPrevMonth, `so với cuối T${prevMonth}`], [financeView.changeVsYearAgo, `so với cùng kỳ ${+latest.date.slice(0, 4) - 1}`]] as [number | null, string][])
            .filter(([v]) => v !== null)
            .map(([v, label]) => ({ label, up: v! >= 0, value: fmtVndShort(v!, true), full: fmtVndFull(v!) }));

        const lastMonth = financeView.months[financeView.months.length - 1];
        const rate = lastMonth && lastMonth.income > 0 && lastMonth.savingsRate !== null
            ? { month: `T${parseInt(lastMonth.month.slice(5), 10)}`, value: `${Math.round(lastMonth.savingsRate * 100)}%` }
            : null;

        // ticks every 3 months inside the range
        const firstMonth = monthKey(S[0].date);
        const ticks: { key: string; label: string; x: number }[] = [];
        for (let m = firstMonth; `${m}-01` <= latest.date; m = addMonths(m, 1)) {
            if ((parseInt(m.slice(5), 10) - 1) % 3 !== 0 || `${m}-01` < S[0].date) continue;
            ticks.push({ key: m, label: `T${parseInt(m.slice(5), 10)}/${m.slice(2, 4)}`, x: chart.X(`${m}-01`) / 10 });
        }
        const yGrid = chart.grid.map((v) => ({ v, y: chart.Y(v), label: v ? fmtVndShort(v).replace(" ₫", "") : "0" }));

        const points = S.map((p, i) => ({
            x: chart.xs[i],
            top: i === S.length - 1 ? `hôm nay · ${fmtDayMonth(p.date)}/${p.date.slice(0, 4)}` : `tuần đến CN ${fmtDayMonth(p.date)}/${p.date.slice(0, 4)}`,
            main: fmtVndFull(p.total),
            rows: ordered.filter((l) => layerValue(p, l.key)).map((l) => ({ k: l.label, v: fmtVndFull(layerValue(p, l.key)) })),
        }));

        const invested = financeView.invested;
        const pnl = financeView.investPnl;
        const current = invested + (pnl ?? 0);
        const mx = Math.max(invested, current) || 1;
        const invest = {
            sub: `theo giá ${fmtDayMonth(latest.date)}`,
            invested: fmtVndShort(invested),
            investedFull: fmtVndFull(invested),
            current: pnl === null ? "chưa có giá" : fmtVndShort(current),
            currentFull: fmtVndFull(current),
            barA: (invested / mx) * 100,
            barB: (current / mx) * 100,
            pnl: pnl === null || !invested ? "" : `${pnl >= 0 ? "lời" : "lỗ"} ${fmtVndShort(Math.abs(pnl))} (${pnl >= 0 ? "+" : "−"}${fmt1((Math.abs(pnl) / invested) * 100)}%)`,
            pnlFull: pnl === null ? "" : fmtVndFull(pnl),
            pnlUp: (pnl ?? 0) >= 0,
        };

        const holdings = financeView.holdings;
        const total = holdings.reduce((s, h) => s + (h.value ?? 0), 0) || 1;
        let colorIdx = 0;
        const top5 = holdings.slice(0, 5).map((h) => ({ h, color: h.value === null ? null : h.asset === "VND" ? CASH_COLOR : ALLOC_COLORS[colorIdx++ % ALLOC_COLORS.length] }));
        const rest = holdings.reduce((s, h) => s + (h.value ?? 0), 0) - top5.reduce((s, { h }) => s + (h.value ?? 0), 0);
        const alloc = {
            segs: [
                ...top5.filter((t) => t.color).map(({ h, color }) => ({ key: `${h.account}-${h.asset}`, flex: h.value!, color: color!, title: `${h.asset} · ${Math.round((h.value! / total) * 100)}%` })),
                ...(rest > 0 ? [{ key: "rest", flex: rest, color: "#3a3a3e", title: "Khác" }] : []),
            ],
            rows: top5.map(({ h, color }) => ({
                key: `${h.account}-${h.asset}`,
                color,
                asset: h.asset,
                meta: h.asset === "VND" ? h.account : `${h.account} · ${h.quantity.toLocaleString("vi-VN", { maximumFractionDigits: 6 })}`,
                value: h.value === null ? "chưa có giá" : fmtVndShort(h.value),
                full: h.value === null ? `${h.quantity} ${h.asset} · chưa có giá` : fmtVndFull(h.value),
                priced: h.value !== null,
                share: h.value === null ? "" : `${Math.round((h.value / total) * 100)}%`,
            })),
            missing: financeView.missingPrices.length ? `Chưa có giá: ${financeView.missingPrices.join(", ")} · không cộng vào tổng` : null,
        };

        const months12 = financeView.months.slice(-12);
        const cfHas = months12.some((m) => m.income || m.expense);
        const mx2 = Math.max(1, ...months12.flatMap((m) => [m.income, m.expense, m.invested]));
        const cashflow = months12.map((m, k) => {
            const mo = parseInt(m.month.slice(5), 10);
            const pct = (v: number) => (v ? Math.max((v / mx2) * 100, 2) : 0);
            return {
                key: m.month,
                label: k === 0 || mo === 1 ? `T${mo}/${m.month.slice(2, 4)}` : `T${mo}`,
                rate: m.savingsRate === null ? "" : `${Math.round(m.savingsRate * 100)}%`,
                inc: pct(m.income), exp: pct(m.expense), inv: pct(m.invested),
                incT: `${m.month} · thu ${fmtVndFull(m.income)}`,
                expT: `${m.month} · chi tiêu ${fmtVndFull(m.expense)}`,
                invT: `${m.month} · đầu tư ${fmtVndFull(m.invested)}`,
                unc: m.uncategorized,
            };
        });

        return {
            state: "full" as const,
            dateLabel: fmtDayMonth(latest.date),
            sub: `theo tuần · ${S.length} điểm từ ${S[0].date.slice(5, 7)}/${S[0].date.slice(0, 4)}`,
            total: fmtVndShort(latest.total),
            totalFull: fmtVndFull(latest.total),
            changes,
            rate,
            layers,
            line: chart.line,
            legend,
            mark,
            ticks,
            yGrid,
            points,
            invest,
            alloc,
            cfHas,
            cashflow,
        };
    }, [financeView]);
};
