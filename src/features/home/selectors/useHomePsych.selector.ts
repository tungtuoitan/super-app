import { useMemo } from "react";
import { homeConstants } from "../home.constants";
import { useHomeSelector } from "./useHome.selector";
import { addDays } from "../utils/home.utils";
import { linePaths } from "../utils/homeChart.utils";
import { fmt1, fmtClock, fmtDayMonth } from "../utils/homeFormat.utils";
import { psychLabel } from "../utils/homePsych.utils";
import type { PsychAnswer, PsychQuestionView } from "../types/home.types";

/** How a non-chart daily question is drawn in the day grid */
export type PsychRowKind = "shade" | "bar" | "dot";

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Position inside a day column from the time of day (08:00 → left, 22:30 → right) */
const hourFrac = (at: string) => {
    const h = +at.slice(11, 13) + +at.slice(14, 16) / 60;
    return Math.min(0.9, Math.max(0.1, 0.15 + ((h - 8) / 14.5) * 0.7));
};
const rowKind = (q: PsychQuestionView): PsychRowKind => (q.type === "yesno" ? "dot" : q.direction === "higherIsWorse" ? "shade" : "bar");

/**
 * Tâm lý view (Claude Design v5): the first two daily 1–5 "higher is better" questions are the
 * chart lines (mood, energy); other daily questions are rows; weekly questions get 12-week strips.
 * Nothing here names a question — everything comes from the bank in the tracker description.
 */
export const useHomePsychSelector = () => {
    const { psychView, dayColumns, status } = useHomeSelector();
    const { todayKey } = status;

    return useMemo(() => {
        if (psychView.masked) return { masked: true as const };
        const { questions, stats, days, weeks } = psychView;
        const todayIdx = days.indexOf(todayKey);
        const from7 = addDays(todayKey, -6);
        const from14 = addDays(todayKey, -13);
        const recent = (q: PsychQuestionView, from: string) => q.answers.filter((a) => a.date >= from && a.date <= todayKey);
        const avgLabel = (q: PsychQuestionView, as: PsychAnswer[]) => {
            const v = average(as.map((a) => a.value));
            return v === null ? null : { value: v, text: fmt1(v), label: psychLabel(q, v) };
        };

        const daily = questions.filter((q) => q.frequency === "daily");
        const lineQs = daily.filter((q) => q.type === "scale" && q.direction === "higherIsBetter").slice(0, 2);
        const rowQs = daily.filter((q) => !lineQs.includes(q));
        const weeklyQs = questions.filter((q) => q.frequency === "weekly");

        const firsts = daily.flatMap((q) => [...q.answers, ...q.skips].map((a) => a.date)).sort();
        const botStart = firsts[0] ?? todayKey;
        const botIdx = botStart <= days[0] ? 0 : Math.max(0, days.indexOf(botStart));

        // ── chart (y in % of the plot; columns are 1/14 wide) ────────────────────
        const lineColor = ["#ededed", "#7fc4d6"];
        const lines = lineQs.map((q, k) => {
            const Y = (v: number) => 8 + ((q.max - v) / (q.max - q.min)) * 80;
            const paths = linePaths(q.dayAvg.map((d) => d.avg), botIdx, todayIdx, (i) => (i + 0.5) * 100, Y);
            const dots = q.answers
                .filter((a) => days.includes(a.date))
                .map((a) => ({
                    key: `${q.id}-${a.at}`,
                    x: ((days.indexOf(a.date) + hourFrac(a.at)) / days.length) * 100,
                    y: Y(a.value),
                    tipTop: `${fmtDayMonth(a.date)} · ${fmtClock(a.at)}`,
                    tipMain: `${q.short}: ${a.label}${a.note ? ` — ${a.note}` : ""}`,
                }));
            return { id: q.id, short: q.short, color: lineColor[k], offset: k ? 3 : -3, ...paths, dots, Y };
        });
        const skipDots = lineQs[0]
            ? lineQs[0].skips
                .filter((s) => s.reason === "bad" && days.includes(s.date))
                .map((s) => ({ key: `skip-${s.at}`, x: ((days.indexOf(s.date) + hourFrac(s.at)) / days.length) * 100, y: 96, tipTop: `${fmtDayMonth(s.date)} · ${fmtClock(s.at)}`, tipMain: "Bỏ qua" }))
            : [];
        const scaleQ = lineQs[0];
        const yLabels = scaleQ
            ? [scaleQ.max, Math.round((scaleQ.max + scaleQ.min) / 2), scaleQ.min].map((v) => ({ v, text: `${v} · ${psychLabel(scaleQ, v)}`, y: lines[0].Y(v) }))
            : [];
        const gridYs = scaleQ ? Array.from({ length: scaleQ.max - scaleQ.min + 1 }, (_, i) => ({ y: lines[0].Y(scaleQ.min + i), strong: i % 2 === 0 })) : [];
        const avg7 = (q: PsychQuestionView | undefined) => {
            if (!q) return "—";
            const r = recent(q, from7);
            return r.length >= homeConstants.psychMinAnswers ? fmt1(average(r.map((a) => a.value))!) : r.length ? "…" : "—";
        };

        // ── rows (other daily questions) ─────────────────────────────────────────
        const rows = rowQs.map((q) => {
            const kind = rowKind(q);
            const cells = days.map((d, i) => {
                if (i < botIdx) return { date: d, state: "before" as const, title: "Chưa có bot check-in", value: null };
                if (i > todayIdx) return { date: d, state: "future" as const, title: "", value: null };
                const as = q.answers.filter((a) => a.date === d);
                if (!as.length) return { date: d, state: "none" as const, title: `${fmtDayMonth(d)} · ${q.short}: không có câu trả lời`, value: null };
                const notes = as.map((a) => a.note).filter(Boolean);
                return {
                    date: d,
                    state: "value" as const,
                    value: average(as.map((a) => a.value))!,
                    title: `${fmtDayMonth(d)} · ${q.short}: ${as.map((a) => a.label).join(", ")}${notes.length ? ` — ${notes.join("; ")}` : ""}`,
                };
            });
            const r7 = recent(q, from7);
            const collecting = recent(q, from14).length < homeConstants.psychMinAnswers;
            let summary = "—";
            if (collecting) summary = "đang thu thập";
            else if (r7.length && kind === "dot") {
                const ds = new Set(r7.map((a) => a.date));
                const yes = new Set(r7.filter((a) => a.value >= 1).map((a) => a.date));
                summary = `${yes.size}/${ds.size} ngày`;
            } else if (r7.length) summary = avgLabel(q, r7)!.label;
            return { id: q.id, short: q.short, kind, min: q.min, max: q.max, cells, summary, collecting };
        });

        // ── weekly strips ────────────────────────────────────────────────────────
        const weekly = weeklyQs.map((q) => ({
            id: q.id,
            short: q.short,
            text: q.text,
            type: q.type,
            n: q.answers.length,
            collecting: q.answers.length < homeConstants.psychMinAnswers,
            latest: q.latest ? `gần nhất: ${q.latest.label} · ${fmtDayMonth(q.latest.date)}` : "chưa có câu trả lời",
            cells: q.weekAvg.map((w, j) => ({
                key: w.weekStart,
                current: j === q.weekAvg.length - 1,
                value: w.avg,
                title: `Tuần ${fmtDayMonth(w.weekStart)}: ${w.avg === null ? (j === q.weekAvg.length - 1 ? "tuần này, chưa hỏi" : "không có câu trả lời") : psychLabel(q, w.avg)}`,
            })),
        }));
        const weekTicks = weeks.map((w, j) => (j === 0 ? fmtDayMonth(w) : w.slice(5, 7) !== weeks[j - 1].slice(5, 7) ? `T${parseInt(w.slice(5, 7), 10)}` : ""));

        // ── overview card ────────────────────────────────────────────────────────
        const [moodQ, energyQ] = lineQs;
        const m7 = moodQ ? recent(moodQ, from7) : [];
        const e7 = energyQ ? recent(energyQ, from7) : [];
        const kpi = {
            collecting: m7.length < homeConstants.psychMinAnswers,
            collectText: `${m7.length}/${homeConstants.psychMinAnswers} câu trả lời trong 7 ngày`,
            mood: moodQ ? avgLabel(moodQ, m7) : null,
            energy: energyQ ? avgLabel(energyQ, e7) : null,
            energyShort: energyQ?.short ?? "",
            spark: moodQ ? linePaths(moodQ.dayAvg.map((d) => d.avg), 0, todayIdx, (i) => (i + 0.5) * 100, (v) => 4 + ((moodQ.max - v) / (moodQ.max - moodQ.min)) * 32) : null,
            sparkMid: moodQ ? 4 + ((moodQ.max - (moodQ.max + moodQ.min) / 2) / (moodQ.max - moodQ.min)) * 32 : 20,
        };

        const moodDays = moodQ ? new Set(recent(moodQ, from14).map((a) => a.date)).size : 0;
        const skipped = stats.asked - stats.answered;
        return {
            masked: false as const,
            days,
            todayIdx,
            hasBank: questions.length > 0,
            lines,
            skipDots,
            yLabels,
            gridYs,
            botIdx,
            botStartText: `bot bắt đầu ${fmtDayMonth(botStart)}`,
            collecting: moodDays < 5,
            collectText: `Đang thu thập · ${moodQ ? recent(moodQ, from14).length : 0} câu trả lời từ ${fmtDayMonth(botStart)}`,
            mood7: avg7(moodQ),
            energy7: avg7(energyQ),
            rows,
            weekly,
            weekTicks,
            kpi,
            stats: {
                main: `Trả lời ${stats.answered}/${stats.asked} lần`,
                sub: `· bỏ qua ${skipped}`,
                detail: `bận ${stats.skipped.busy} · không muốn nói ${stats.skipped.bad} · tắt hôm nay ${stats.skipped.today} · không phản hồi ${stats.skipped.none}`,
            },
        };
    }, [psychView, todayKey, dayColumns]);
};
