import {
    addMonths,
    buildActivityView,
    buildDayColumns,
    buildDayRows,
    buildFinanceView,
    buildKpis,
    buildTimelineMarks,
    buildTrackerSlots,
    buildWeekBars,
    buildWeekKeys,
    countMaskedTrackers,
    isoWeekday,
    remainingSeconds,
    weekStartKey,
} from "./home.utils";
import type { FinanceSummaryDTO, HabitSeriesDTO, TrackerConfig } from "../types/home.types";

const configs: Record<number, TrackerConfig> = {
    1: { kind: "daily", weeklyTarget: 7 },
    2: { kind: "count", weeklyTarget: 5 },
    3: { kind: "limit", weeklyLimit: 2, weekendOnly: true },
    4: { kind: "event" },
};
const track = (date: string, content = "") => ({ commentId: 0, date, at: `${date}T12:00:00.000+07:00`, type: "track" as const, content });
const note = (date: string, content: string) => ({ commentId: 0, date, at: `${date}T12:00:00.000+07:00`, type: "comment" as const, content });
const series = (taskId: number, entries: HabitSeriesDTO["entries"]): HabitSeriesDTO => ({ taskId, title: `T${taskId}`, projectId: 15, status: "background_progress", entries });

const TODAY = "2026-10-07"; // Wednesday

describe("dates", () => {
    it("weekday + week start (Monday)", () => {
        expect(isoWeekday("2026-10-05")).toBe(1);
        expect(isoWeekday("2026-10-04")).toBe(7);
        expect(weekStartKey("2026-10-04")).toBe("2026-09-28");
        expect(weekStartKey(TODAY)).toBe("2026-10-05");
    });
    it("week keys end with the current week", () => {
        expect(buildWeekKeys(TODAY, 3)).toEqual(["2026-09-21", "2026-09-28", "2026-10-05"]);
    });
    it("addMonths across years", () => {
        expect(addMonths("2026-01", -1)).toBe("2025-12");
        expect(addMonths("2026-10", -12)).toBe("2025-10");
    });
});

describe("activity", () => {
    it("groups projects, unknown → other, drops empty groups", () => {
        const weeks = ["2026-09-28", "2026-10-05"];
        const view = buildActivityView(
            [
                { weekStart: "2026-09-28", projectId: 11, projectName: "SuperApp", projectStatus: "active", count: 3 },
                { weekStart: "2026-10-05", projectId: 5, projectName: "module", projectStatus: "completed", count: 2 },
                { weekStart: "2026-10-05", projectId: 99, projectName: "new", projectStatus: "open", count: 1 },
                { weekStart: "2026-01-05", projectId: 11, projectName: "SuperApp", projectStatus: "active", count: 50 },
            ],
            [{ key: "superapp", label: "SuperApp", projectIds: [5, 11] }, { key: "learn", label: "Học", projectIds: [30] }],
            { key: "other", label: "Khác" },
            weeks,
        );
        expect(view.groups.map((g) => [g.key, g.counts])).toEqual([["superapp", [3, 2]], ["other", [0, 1]]]);
        expect(view.weekTotals).toEqual([3, 3]);
        expect(view.groups[0].projects[0]).toEqual({ projectId: 11, name: "SuperApp", total: 3 });
    });
});

describe("trackers", () => {
    const pub = [series(2, [track("2026-10-05"), track("2026-10-06"), note("2026-10-01", "mưa")]), series(1, [track("2026-10-05"), track("2026-10-05"), track("2026-10-06")])];
    const sensitive = [series(3, [track("2026-10-02"), track("2026-10-03"), track("2026-10-06")]), series(4, [track("2026-10-03", "đợt 1")])];

    it("private mode: public first in allowlist order, then fixed placeholders with no data", () => {
        const slots = buildTrackerSlots(pub, null, [1, 2], configs, { kind: "count" }, 2, "Riêng tư");
        expect(slots.map((s) => s.key)).toEqual(["t1", "t2", "masked1", "masked2"]);
        expect(slots[2]).toEqual({ key: "masked1", label: "Riêng tư 1", config: null, series: null });
        expect(countMaskedTrackers(configs, [1, 2])).toBe(1); // event trackers become marks, not masked rows
    });

    it("kpis: daily counts distinct days, count/limit count entries, masked has no values", () => {
        const kpis = buildKpis(buildTrackerSlots(pub, null, [1, 2], configs, { kind: "count" }, 1, "Riêng tư"), TODAY);
        expect(kpis[0]).toMatchObject({ key: "t1", value: 2, target: 7, status: "onPace" });
        expect(kpis[1]).toMatchObject({ key: "t2", value: 2, target: 5, status: "onPace" });
        expect(kpis[2]).toMatchObject({ masked: true, value: null, target: null, limit: null });

        const full = buildKpis(buildTrackerSlots(pub, sensitive, [1, 2], configs, { kind: "count" }, 0, ""), TODAY);
        expect(full[2]).toMatchObject({ key: "t3", value: 1, limit: 2, weekdayCount: 1, status: "neutral" });
    });

    it("kpi behind when the target is out of reach", () => {
        const late = [series(2, [track("2026-10-10")])]; // Saturday: 1 done, only Sat+Sun left
        expect(buildKpis(buildTrackerSlots(late, null, [2], configs, { kind: "count" }, 0, ""), "2026-10-10")[0].status).toBe("behind");
    });

    it("day grid: previous + current week, states and notes", () => {
        const cols = buildDayColumns(TODAY, 14);
        expect(cols[0].date).toBe("2026-09-28");
        expect(cols[13].date).toBe("2026-10-11");
        expect(cols.find((c) => c.isToday)?.date).toBe(TODAY);
        const rows = buildDayRows(buildTrackerSlots(pub, null, [1, 2], configs, { kind: "count" }, 1, "Riêng tư"), cols, TODAY);
        const run = rows[1];
        const state = (d: string) => run.cells!.find((c) => c.date === d)!;
        expect(state("2026-10-01")).toEqual({ date: "2026-10-01", state: "note", notes: ["mưa"] });
        expect(state("2026-10-05").state).toBe("done");
        expect(state("2026-10-02").state).toBe("empty");
        expect(state(TODAY).state).toBe("today");
        expect(state("2026-10-08").state).toBe("future");
        expect(run.weekSummary).toBe("2/5");
        expect(rows[2]).toMatchObject({ masked: true, cells: null, weekSummary: null });
    });

    it("week bars: null before first entry, events excluded, weekday split for limit", () => {
        const weeks = ["2026-09-21", "2026-09-28", "2026-10-05"];
        const bars = buildWeekBars(buildTrackerSlots(pub, sensitive, [1, 2], configs, { kind: "count" }, 0, ""), weeks, TODAY);
        expect(bars.map((b) => b.key)).toEqual(["t1", "t2", "t3"]);
        expect(bars[1].values).toEqual([null, 0, 2]);
        expect(bars[2].values).toEqual([null, 2, 1]);
        expect(bars[2].weekdayValues).toEqual([null, 1, 1]);
    });

    it("timeline marks only from event trackers", () => {
        const slots = buildTrackerSlots(pub, sensitive, [1, 2], configs, { kind: "count" }, 0, "");
        expect(buildTimelineMarks(slots)).toEqual([{ date: "2026-10-03", note: "đợt 1" }]);
    });
});

describe("finance", () => {
    const month = (m: string, netWorthEndVnd: number, incomeVnd = 0, expenseVnd = 0, investedVnd = 0) =>
        ({ month: m, netWorthEndVnd, incomeVnd, expenseVnd, investedVnd, uncategorized: 0 });
    const point = (date: string, totalVnd: number) => ({ date, totalVnd, accounts: { BIDV: totalVnd }, debtVnd: 0 });
    const summary = (overrides: Partial<FinanceSummaryDTO> = {}): FinanceSummaryDTO => ({
        from: "2025-08-01", to: "2026-10-05", interval: "week", series: [], months: [], holdings: [], investedVnd: 0, missingPrices: [], ...overrides,
    });

    it("trims empty leading months/points; change vs previous month and a year ago; savings rate", () => {
        const view = buildFinanceView(summary({
            months: [month("2025-08-01", 0), month("2025-10-01", 100), month("2026-09-01", 110, 30, 20), month("2026-10-01", 125)],
            series: [point("2025-08-03", 0), point("2025-10-05", 100), point("2026-10-05", 125)],
        }));
        expect(view.months.map((m) => m.month)).toEqual(["2025-10", "2026-09", "2026-10"]);
        expect(view.series.map((p) => p.date)).toEqual(["2025-10-05", "2026-10-05"]);
        expect(view.latest?.total).toBe(125);
        expect(view.changeVsPrevMonth).toBe(15);
        expect(view.changeVsYearAgo).toBe(25);
        expect(view.months[1].savingsRate).toBeCloseTo(1 / 3);
        expect(view.months[0].savingsRate).toBeNull();
    });

    it("investment P&L = value of non-VND holdings − money put in", () => {
        const view = buildFinanceView(summary({
            investedVnd: 50,
            holdings: [
                { account: "BIDV", asset: "VND", quantity: 900, priceVnd: 1, valueVnd: 900 },
                { account: "Binance", asset: "BTC", quantity: 0.001, priceVnd: 60000, valueVnd: 60 },
                { account: "Binance", asset: "XYZ", quantity: 3, priceVnd: null, valueVnd: null },
            ],
        }));
        expect(view.invested).toBe(50);
        expect(view.investPnl).toBe(10);
        expect(view.holdings[2].value).toBeNull();
    });

    it("no data → nothing to show", () => {
        const view = buildFinanceView(summary());
        expect(view.latest).toBeNull();
        expect(view.changeVsPrevMonth).toBeNull();
        expect(view.investPnl).toBeNull();
    });
});

describe("privacy", () => {
    it("remaining seconds", () => {
        expect(remainingSeconds(null, 0)).toBe(0);
        expect(remainingSeconds(10_500, 0)).toBe(11);
        expect(remainingSeconds(1_000, 5_000)).toBe(0);
    });
});
