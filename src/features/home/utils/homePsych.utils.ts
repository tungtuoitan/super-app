/**
 * Psychology check-in (tracker #1486, browser bot #1485) — pure functions.
 * The bot writes one comment per prompt:
 *   track   "[qid] <value> — <label> · <note>"
 *   comment "[qid] skip:<busy|bad|none|today> — <text>"
 * The question bank (texts, scales, short labels) lives in the tracker description as a JSON block,
 * so nothing sensitive is in this public repo.
 */

import type {
    HabitSeriesDTO,
    PsychAnswer,
    PsychBankQuestion,
    PsychQuestionView,
    PsychSkip,
    PsychSkipReason,
    PsychView,
} from "../types/home.types";
import { addDays } from "./home.utils";

const SKIP_REASONS: PsychSkipReason[] = ["busy", "bad", "none", "today"];

const decodeEntities = (s: string) =>
    s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

/** Question bank from the tracker description (HTML); [] when there is none or it is invalid. */
export const parsePsychBank = (descriptionHtml: string | null | undefined): PsychBankQuestion[] => {
    const m = /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/i.exec(descriptionHtml ?? "");
    if (!m) return [];
    try {
        const bank = JSON.parse(decodeEntities(m[1]));
        return Array.isArray(bank?.questions) ? bank.questions.filter((q: PsychBankQuestion) => q?.id && q?.text) : [];
    } catch {
        return [];
    }
};

type ParsedEntry = { qid: string; value: number; note: string | null } | { qid: string; skip: PsychSkipReason } | null;

/** "[chan_nan] 2 — Khá · họp dài" → answer; "[chan_nan] skip:bad — …" → skip; anything else → null. */
export const parsePsychContent = (content: string): ParsedEntry => {
    const m = /^\[([a-z0-9_]+)\]\s+(\S+)(.*)$/i.exec(content.trim());
    if (!m) return null;
    const [, qid, token, rest] = m;
    if (token.startsWith("skip:")) {
        const reason = token.slice(5) as PsychSkipReason;
        return SKIP_REASONS.includes(reason) ? { qid, skip: reason } : null;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) return null;
    const noteAt = rest.indexOf(" · ");
    const note = noteAt >= 0 ? rest.slice(noteAt + 3).trim() || null : null;
    return { qid, value, note };
};

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const toQuestion = (q: PsychBankQuestion): Omit<PsychQuestionView, "dayAvg" | "weekAvg" | "latest"> => {
    const isYesNo = q.type === "yesno";
    const min = isYesNo ? 0 : q.min ?? 1;
    const max = isYesNo ? 1 : q.max ?? 5;
    return {
        id: q.id,
        text: q.text,
        short: q.short ?? q.text,
        type: isYesNo ? "yesno" : "scale",
        min,
        max,
        labels: isYesNo ? ["Không", "Có"] : q.labels ?? Array.from({ length: max - min + 1 }, (_, i) => String(min + i)),
        frequency: q.frequency === "weekly" ? "weekly" : "daily",
        direction: q.direction === "higherIsWorse" ? "higherIsWorse" : "higherIsBetter",
        answers: [],
        skips: [],
    };
};

/** Label of a (possibly averaged) value on the question's scale. */
export const psychLabel = (q: Pick<PsychQuestionView, "labels" | "min" | "max">, v: number) =>
    q.labels[Math.min(q.max, Math.max(q.min, Math.round(v))) - q.min] ?? String(Math.round(v));

export const MASKED_PSYCH: PsychView = {
    masked: true,
    questions: [],
    stats: { asked: 0, answered: 0, skipped: { busy: 0, bad: 0, none: 0, today: 0 } },
    days: [],
    weeks: [],
};

/**
 * Answers/skips per question, daily averages over `days` (the 14-day grid), weekly averages over
 * `weeks`, and prompt stats for the last 14 days up to `todayKey`.
 */
export const buildPsychView = (
    series: HabitSeriesDTO | null,
    bank: PsychBankQuestion[],
    days: string[],
    weeks: string[],
    todayKey: string,
): PsychView => {
    const byId = new Map(bank.map((q) => [q.id, toQuestion(q)]));
    const stats: PsychView["stats"] = { asked: 0, answered: 0, skipped: { busy: 0, bad: 0, none: 0, today: 0 } };
    const statFrom = addDays(todayKey, -13);

    for (const e of series?.entries ?? []) {
        const parsed = parsePsychContent(e.content);
        const q = parsed && byId.get(parsed.qid);
        if (!parsed || !q) continue;
        const inStats = e.date >= statFrom && e.date <= todayKey;
        if ("skip" in parsed) {
            q.skips.push({ at: e.at, date: e.date, reason: parsed.skip } as PsychSkip);
            if (inStats) {
                stats.asked++;
                stats.skipped[parsed.skip]++;
            }
            continue;
        }
        if (parsed.value < q.min || parsed.value > q.max) continue;
        q.answers.push({ at: e.at, date: e.date, value: parsed.value, label: psychLabel(q, parsed.value), note: parsed.note } as PsychAnswer);
        if (inStats) {
            stats.asked++;
            stats.answered++;
        }
    }

    const questions = [...byId.values()].map((q) => {
        const answers = [...q.answers].sort((a, b) => a.at.localeCompare(b.at));
        const avgOn = (from: string, to: string) => average(answers.filter((a) => a.date >= from && a.date <= to).map((a) => a.value));
        return {
            ...q,
            answers,
            skips: [...q.skips].sort((a, b) => a.at.localeCompare(b.at)),
            dayAvg: q.frequency === "daily" ? days.map((date) => ({ date, avg: avgOn(date, date) })) : [],
            weekAvg: weeks.map((weekStart) => ({ weekStart, avg: avgOn(weekStart, addDays(weekStart, 6)) })),
            latest: answers[answers.length - 1] ?? null,
        };
    });

    return { masked: false, questions, stats, days, weeks };
};
