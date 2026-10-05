/**
 * Home (progress dashboard) types — TungRoot #1481.
 * DTOs mirror BE `/api/dashboard/*` and `/api/finance/summary` (#1482); view models are what the UI renders.
 * Dates are calendar keys "YYYY-MM-DD" in the user's timezone (BE buckets them already).
 */

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ActivityWeekPointDTO {
    weekStart: string;
    projectId: number;
    projectName: string;
    projectStatus: string;
    count: number;
}

export interface HabitEntryDTO {
    commentId: number;
    date: string;
    type: "track" | "comment";
    content: string;
}

export interface HabitSeriesDTO {
    taskId: number;
    title: string;
    projectId: number;
    status: string;
    entries: HabitEntryDTO[];
}

/** Net worth at the end of a period, VND. `accounts` = value per account (BIDV, Binance…). */
export interface FinanceNetWorthPointDTO {
    date: string;
    totalVnd: number;
    accounts: Record<string, number>;
    /** Outstanding lent money (+) / borrowed or held for others (−) */
    debtVnd: number;
}

export interface FinanceMonthDTO {
    month: string;
    incomeVnd: number;
    expenseVnd: number;
    investedVnd: number;
    netWorthEndVnd: number;
    uncategorized: number;
}

export interface FinanceHoldingDTO {
    account: string;
    asset: string;
    quantity: number;
    priceVnd: number | null;
    valueVnd: number | null;
}

/** `GET /api/finance/summary` — computed from the transaction ledger (TungRoot #1482). */
export interface FinanceSummaryDTO {
    from: string;
    to: string;
    interval: "day" | "week" | "month";
    series: FinanceNetWorthPointDTO[];
    months: FinanceMonthDTO[];
    holdings: FinanceHoldingDTO[];
    /** Net money put into investments since the beginning */
    investedVnd: number;
    missingPrices: string[];
}

// ── Config ────────────────────────────────────────────────────────────────────

export type PrivacyMode = "private" | "full";

/**
 * daily  — done/not done per day (target = days per week)
 * count  — times per week toward a target
 * limit  — times per week that should stay under a limit (optionally weekend only); no streak, no penalty
 * event  — episodes worth marking on the timeline (no target)
 */
export type TrackerKind = "daily" | "count" | "limit" | "event";

export interface TrackerConfig {
    kind: TrackerKind;
    weeklyTarget?: number;
    weeklyLimit?: number;
    weekendOnly?: boolean;
}

export interface ActivityGroupConfig {
    key: string;
    label: string;
    projectIds: number[];
}

// ── View models ───────────────────────────────────────────────────────────────

export interface ActivityGroupSeries {
    key: string;
    label: string;
    /** One count per week, aligned with ActivityView.weeks */
    counts: number[];
    total: number;
    /** Projects that contributed, most active first */
    projects: { projectId: number; name: string; total: number }[];
}

export interface ActivityView {
    /** Monday keys, oldest first; the last one is the current (partial) week */
    weeks: string[];
    groups: ActivityGroupSeries[];
    weekTotals: number[];
    maxWeekTotal: number;
}

export type KpiStatus = "good" | "onPace" | "behind" | "over" | "neutral";

/** Headline number for one tracker this week. Masked trackers carry no values at all. */
export interface TrackerKpi {
    key: string;
    label: string;
    kind: TrackerKind | null;
    masked: boolean;
    value: number | null;
    target: number | null;
    limit: number | null;
    /** limit trackers: how many of `value` fell on Mon–Fri */
    weekdayCount: number | null;
    status: KpiStatus;
}

export interface DayColumn {
    date: string;
    /** 1 = Monday … 7 = Sunday */
    weekday: number;
    isWeekend: boolean;
    isToday: boolean;
    isFuture: boolean;
}

/** done = tracked; note = only a note that day; empty = past day, nothing recorded; today = not yet recorded */
export type DayCellState = "done" | "note" | "empty" | "today" | "future";

export interface DayCell {
    date: string;
    state: DayCellState;
    /** Contents of the comments that day (track + note), oldest first */
    notes: string[];
}

export interface TrackerDayRow {
    key: string;
    label: string;
    kind: TrackerKind | null;
    masked: boolean;
    /** null when masked */
    cells: DayCell[] | null;
    /** Summary of the current week, e.g. "3/7" — null when masked */
    weekSummary: string | null;
}

export interface TrackerWeekBars {
    key: string;
    label: string;
    kind: TrackerKind | null;
    masked: boolean;
    target: number | null;
    limit: number | null;
    /** Aligned with ActivityView.weeks; null = not tracked yet that week. null array when masked */
    values: (number | null)[] | null;
    /** limit trackers: Mon–Fri part of each week */
    weekdayValues: (number | null)[] | null;
}

export interface TimelineMark {
    date: string;
    note: string;
}

export interface FinanceMonthView {
    /** YYYY-MM */
    month: string;
    /** Net worth at the end of the month (or today for the current month) */
    netWorth: number;
    income: number;
    /** Spending only — investing and lending are not spending */
    expense: number;
    invested: number;
    /** (income - expense) / income; null when no income that month */
    savingsRate: number | null;
    /** Income/expense rows still without a category */
    uncategorized: number;
}

export interface FinancePointView {
    date: string;
    total: number;
    accounts: Record<string, number>;
    debt: number;
}

export interface FinanceHoldingView {
    account: string;
    asset: string;
    quantity: number;
    /** null when no price is known */
    value: number | null;
}

export interface FinanceView {
    masked: boolean;
    /** Oldest first; empty when masked or no data */
    months: FinanceMonthView[];
    /** Weekly net worth points (+ today), oldest first */
    series: FinancePointView[];
    /** Last point (today) */
    latest: FinancePointView | null;
    /** Net worth now − end of previous month / − same day-ish 12 months ago (end of that month) */
    changeVsPrevMonth: number | null;
    changeVsYearAgo: number | null;
    /** Money put into investments so far, and current value of non-VND holdings minus that */
    invested: number;
    investPnl: number | null;
    /** Largest first */
    holdings: FinanceHoldingView[];
    /** Assets without a known price (their value is left out of totals) */
    missingPrices: string[];
}

export interface PrivacyView {
    mode: PrivacyMode;
    /** Seconds left in full mode; 0 in private mode */
    remainingSeconds: number;
    fullDurationMinutes: number;
    durationOptions: readonly number[];
    isUnlocking: boolean;
}

export interface HomeStatusView {
    isLoading: boolean;
    error: string | null;
    /** Epoch ms of the last successful public load */
    loadedAt: number | null;
    todayKey: string;
}
