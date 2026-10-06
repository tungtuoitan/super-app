/**
 * Home (progress dashboard) pure functions — TungRoot #1481.
 * Everything works on calendar keys "YYYY-MM-DD" (local day) so it is trivially testable.
 */

import type {
    ActivityGroupConfig,
    ActivityView,
    ActivityWeekPointDTO,
    DayCell,
    DayColumn,
    FinanceMonthView,
    FinanceMonthDTO,
    FinanceSummaryDTO,
    FinanceView,
    HabitSeriesDTO,
    KpiStatus,
    TimelineMark,
    TrackerConfig,
    TrackerDayRow,
    TrackerKpi,
    TrackerWeekBars,
} from "../types/home.types";

// ── Dates ─────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

export const toDateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDateKey = (key: string): Date => {
    const [y, m, d] = key.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
};

export const addDays = (key: string, days: number): string => {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + days);
    return toDateKey(d);
};

/** 1 = Monday … 7 = Sunday */
export const isoWeekday = (key: string): number => ((parseDateKey(key).getDay() + 6) % 7) + 1;

export const weekStartKey = (key: string): string => addDays(key, 1 - isoWeekday(key));

/** `count` Monday keys ending with the week of `todayKey`, oldest first. */
export const buildWeekKeys = (todayKey: string, count: number): string[] => {
    const current = weekStartKey(todayKey);
    return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)));
};

export const monthKey = (key: string): string => key.slice(0, 7);

export const addMonths = (month: string, delta: number): string => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

// ── Activity ──────────────────────────────────────────────────────────────────

export const buildActivityView = (
    points: ActivityWeekPointDTO[],
    groups: ActivityGroupConfig[],
    other: { key: string; label: string },
    weeks: string[],
): ActivityView => {
    const weekIndex = new Map(weeks.map((w, i) => [w, i]));
    const groupOf = new Map<number, string>();
    groups.forEach((g) => g.projectIds.forEach((id) => groupOf.set(id, g.key)));

    const allGroups = [...groups.map((g) => ({ key: g.key, label: g.label })), other];
    const byKey = new Map(
        allGroups.map((g) => [g.key, { ...g, counts: weeks.map(() => 0), projectTotals: new Map<number, { name: string; total: number }>() }]),
    );

    points.forEach((p) => {
        const i = weekIndex.get(p.weekStart);
        if (i === undefined) return;
        const g = byKey.get(groupOf.get(p.projectId) ?? other.key)!;
        g.counts[i] += p.count;
        const prev = g.projectTotals.get(p.projectId);
        g.projectTotals.set(p.projectId, { name: p.projectName, total: (prev?.total ?? 0) + p.count });
    });

    const series = [...byKey.values()]
        .map((g) => ({
            key: g.key,
            label: g.label,
            counts: g.counts,
            total: g.counts.reduce((a, b) => a + b, 0),
            projects: [...g.projectTotals.entries()]
                .map(([projectId, v]) => ({ projectId, name: v.name, total: v.total }))
                .sort((a, b) => b.total - a.total),
        }))
        .filter((g) => g.total > 0);

    const weekTotals = weeks.map((_, i) => series.reduce((sum, g) => sum + g.counts[i], 0));
    return { weeks, groups: series, weekTotals, maxWeekTotal: Math.max(0, ...weekTotals) };
};

// ── Trackers ──────────────────────────────────────────────────────────────────

/** Visible tracker = real data; masked tracker = placeholder with no data at all. */
export interface TrackerSlot {
    key: string;
    label: string;
    config: TrackerConfig | null;
    series: HabitSeriesDTO | null;
}

/**
 * Public trackers first (allowlist order), then sensitive ones. In private mode sensitive trackers
 * are unknown (not fetched), so `maskedCount` placeholders stand in for them.
 */
export const buildTrackerSlots = (
    publicSeries: HabitSeriesDTO[],
    sensitiveSeries: HabitSeriesDTO[] | null,
    publicIds: number[],
    configs: Record<number, TrackerConfig>,
    defaultConfig: TrackerConfig,
    maskedCount: number,
    maskedLabel: string,
): TrackerSlot[] => {
    const ordered = [...publicSeries].sort((a, b) => publicIds.indexOf(a.taskId) - publicIds.indexOf(b.taskId));
    const visible = (s: HabitSeriesDTO): TrackerSlot => ({
        key: `t${s.taskId}`,
        label: s.title,
        config: configs[s.taskId] ?? defaultConfig,
        series: s,
    });
    const slots = ordered.map(visible);
    if (sensitiveSeries) return [...slots, ...sensitiveSeries.map(visible)];
    return [
        ...slots,
        ...Array.from({ length: maskedCount }, (_, i) => ({ key: `masked${i + 1}`, label: `${maskedLabel} ${i + 1}`, config: null, series: null })),
    ];
};

/**
 * Habit rows hidden in private mode: configured, not on the public allowlist, and not an "event"
 * tracker (those only become timeline marks in full mode).
 */
export const countMaskedTrackers = (configs: Record<number, TrackerConfig>, publicIds: number[]): number =>
    Object.entries(configs).filter(([id, c]) => !publicIds.includes(Number(id)) && c.kind !== "event").length;

const trackDates = (s: HabitSeriesDTO) => s.entries.filter((e) => e.type === "track").map((e) => e.date);

/** Value of a tracker in [from, to]: distinct days for "daily", number of track entries otherwise. */
const countInRange = (s: HabitSeriesDTO, config: TrackerConfig, from: string, to: string): number => {
    const dates = trackDates(s).filter((d) => d >= from && d <= to);
    return config.kind === "daily" ? new Set(dates).size : dates.length;
};

const kpiStatus = (config: TrackerConfig, value: number, todayKey: string): KpiStatus => {
    const daysLeft = 7 - isoWeekday(todayKey); // days after today in this week
    if (config.kind === "limit") return value > (config.weeklyLimit ?? Infinity) ? "over" : "neutral";
    if (config.kind === "event" || !config.weeklyTarget) return "neutral";
    const target = config.weeklyTarget;
    if (value >= target) return "good";
    // today still counts as "can do"; behind = cannot reach the target any more
    if (value + daysLeft + 1 < target) return "behind";
    const expectedByYesterday = Math.floor((target * (isoWeekday(todayKey) - 1)) / 7);
    return value >= expectedByYesterday ? "onPace" : "behind";
};

export const buildKpis = (slots: TrackerSlot[], todayKey: string): TrackerKpi[] => {
    const from = weekStartKey(todayKey);
    return slots.map(({ key, label, config, series }) => {
        if (!config || !series) {
            return { key, label, kind: null, masked: true, value: null, target: null, limit: null, weekdayCount: null, status: "neutral" };
        }
        const value = countInRange(series, config, from, todayKey);
        const weekdayCount = config.kind === "limit"
            ? trackDates(series).filter((d) => d >= from && d <= todayKey && isoWeekday(d) <= 5).length
            : null;
        return {
            key,
            label,
            kind: config.kind,
            masked: false,
            value,
            target: config.weeklyTarget ?? null,
            limit: config.weeklyLimit ?? null,
            weekdayCount,
            status: kpiStatus(config, value, todayKey),
        };
    });
};

/** Previous week + current week (Mon → Sun), `days` columns. */
export const buildDayColumns = (todayKey: string, days: number): DayColumn[] => {
    const start = addDays(weekStartKey(todayKey), -(days - 7));
    return Array.from({ length: days }, (_, i) => {
        const date = addDays(start, i);
        const weekday = isoWeekday(date);
        return { date, weekday, isWeekend: weekday >= 6, isToday: date === todayKey, isFuture: date > todayKey };
    });
};

const weekSummary = (config: TrackerConfig, series: HabitSeriesDTO, todayKey: string): string => {
    const value = countInRange(series, config, weekStartKey(todayKey), todayKey);
    if (config.weeklyTarget) return `${value}/${config.weeklyTarget}`;
    if (config.weeklyLimit !== undefined) return `${value}/≤${config.weeklyLimit}`;
    return String(value);
};

export const buildDayRows = (slots: TrackerSlot[], columns: DayColumn[], todayKey: string): TrackerDayRow[] =>
    slots.map(({ key, label, config, series }) => {
        if (!config || !series) return { key, label, kind: null, masked: true, cells: null, weekSummary: null };
        const cells: DayCell[] = columns.map((c) => {
            const entries = series.entries.filter((e) => e.date === c.date);
            const notes = entries.map((e) => e.content).filter(Boolean);
            const done = entries.some((e) => e.type === "track");
            const state = c.isFuture ? "future" : done ? "done" : entries.length ? "note" : c.isToday ? "today" : "empty";
            return { date: c.date, state, notes };
        });
        return { key, label, kind: config.kind, masked: false, cells, weekSummary: weekSummary(config, series, todayKey) };
    });

/** Weekly values aligned with `weeks`; weeks before the first recorded entry are null (not tracked yet). */
export const buildWeekBars = (slots: TrackerSlot[], weeks: string[], todayKey: string): TrackerWeekBars[] =>
    slots
        .filter(({ config }) => !config || config.kind !== "event")
        .map(({ key, label, config, series }) => {
            if (!config || !series) {
                return { key, label, kind: null, masked: true, target: null, limit: null, values: null, weekdayValues: null };
            }
            const first = series.entries.map((e) => e.date).sort()[0];
            const firstWeek = first ? weekStartKey(first) : null;
            const values = weeks.map((w) => (firstWeek && w >= firstWeek ? countInRange(series, config, w, addDays(w, 6) < todayKey ? addDays(w, 6) : todayKey) : null));
            const weekdayValues = config.kind === "limit"
                ? weeks.map((w) => (firstWeek && w >= firstWeek ? trackDates(series).filter((d) => d >= w && d <= addDays(w, 4)).length : null))
                : null;
            return {
                key,
                label,
                kind: config.kind,
                masked: false,
                target: config.weeklyTarget ?? null,
                limit: config.weeklyLimit ?? null,
                values,
                weekdayValues,
            };
        });

/** Episodes of "event" trackers, shown as bands across the timeline (full mode only). */
export const buildTimelineMarks = (slots: TrackerSlot[]): TimelineMark[] =>
    slots
        .filter(({ config, series }) => config?.kind === "event" && series)
        .flatMap(({ series }) => series!.entries.filter((e) => e.type === "track").map((e) => ({ date: e.date, note: e.content })))
        .sort((a, b) => a.date.localeCompare(b.date));

// ── Finance ───────────────────────────────────────────────────────────────────

const toMonthView = (m: FinanceMonthDTO): FinanceMonthView => ({
    month: monthKey(m.month),
    netWorth: m.netWorthEndVnd,
    income: m.incomeVnd,
    expense: m.expenseVnd,
    invested: m.investedVnd,
    savingsRate: m.incomeVnd > 0 ? (m.incomeVnd - m.expenseVnd) / m.incomeVnd : null,
    uncategorized: m.uncategorized,
});

export const MASKED_FINANCE: FinanceView = {
    masked: true, months: [], series: [], latest: null, changeVsPrevMonth: null, changeVsYearAgo: null,
    invested: 0, investPnl: null, holdings: [], missingPrices: [],
};

/** True when a month has nothing yet (before the first transaction) — trimmed from the front. */
const isEmptyMonth = (m: FinanceMonthDTO) =>
    m.netWorthEndVnd === 0 && m.incomeVnd === 0 && m.expenseVnd === 0 && m.investedVnd === 0;

export const buildFinanceView = (summary: FinanceSummaryDTO): FinanceView => {
    const firstMonth = summary.months.findIndex((m) => !isEmptyMonth(m));
    const months = firstMonth < 0 ? [] : summary.months.slice(firstMonth).map(toMonthView);
    const firstPoint = summary.series.findIndex((p) => p.totalVnd !== 0);
    const series = (firstPoint < 0 ? [] : summary.series.slice(firstPoint))
        .map((p) => ({ date: p.date, total: p.totalVnd, accounts: p.accounts, debt: p.debtVnd }));
    const latest = series[series.length - 1] ?? null;

    const netWorthAt = (month: string) => months.find((m) => m.month === month)?.netWorth ?? null;
    const diff = (other: number | null) => (latest && other !== null ? latest.total - other : null);
    const thisMonth = latest ? monthKey(latest.date) : null;

    const holdings = summary.holdings.map((h) => ({ account: h.account, asset: h.asset, quantity: h.quantity, value: h.valueVnd }));
    const investValue = summary.holdings.filter((h) => h.asset !== "VND").reduce((sum, h) => sum + (h.valueVnd ?? 0), 0);
    return {
        masked: false,
        months,
        series,
        latest,
        changeVsPrevMonth: thisMonth ? diff(netWorthAt(addMonths(thisMonth, -1))) : null,
        changeVsYearAgo: thisMonth ? diff(netWorthAt(addMonths(thisMonth, -12))) : null,
        invested: summary.investedVnd,
        investPnl: summary.investedVnd > 0 || investValue > 0 ? investValue - summary.investedVnd : null,
        holdings,
        missingPrices: summary.missingPrices,
    };
};

// ── Privacy ───────────────────────────────────────────────────────────────────

export const remainingSeconds = (fullUntil: number | null, nowMs: number): number =>
    fullUntil ? Math.max(0, Math.ceil((fullUntil - nowMs) / 1000)) : 0;
