import { buildPsychView, parsePsychBank, parsePsychContent, psychLabel } from "./homePsych.utils";
import { linePaths, streamLayout } from "./homeChart.utils";
import { fmtVndShort, fmtVndFull } from "./homeFormat.utils";
import type { HabitSeriesDTO } from "../types/home.types";

const bankJson = {
    questions: [
        { id: "q_mood", short: "Mood", text: "Mood now?", type: "scale", min: 1, max: 5, labels: ["A", "B", "C", "D", "E"], frequency: "daily", direction: "higherIsBetter" },
        { id: "q_low", short: "Low", text: "Low today?", type: "scale", min: 0, max: 3, labels: ["No", "Bit", "Quite", "Very"], frequency: "daily", direction: "higherIsWorse" },
        { id: "q_talk", short: "Talk", text: "Talked?", type: "yesno", frequency: "weekly" },
    ],
};
const html = `<p>x</p><pre class="rich-text-codeblock"><code class="language-json">${JSON.stringify(bankJson).replace(/"/g, "&quot;")}</code></pre>`;
const entry = (date: string, time: string, type: "track" | "comment", content: string) =>
    ({ commentId: 0, date, at: `${date}T${time}:00.000+07:00`, type, content });

describe("psych bank + content", () => {
    it("reads the JSON block of the description (HTML-escaped)", () => {
        expect(parsePsychBank(html).map((q) => q.id)).toEqual(["q_mood", "q_low", "q_talk"]);
        expect(parsePsychBank("<p>none</p>")).toEqual([]);
        expect(parsePsychBank("<pre><code>{bad json</code></pre>")).toEqual([]);
    });
    it("parses answers and skips written by the bot", () => {
        expect(parsePsychContent("[q_low] 2 — Quite · long meeting")).toEqual({ qid: "q_low", value: 2, note: "long meeting" });
        expect(parsePsychContent("[q_mood] 4 — D")).toEqual({ qid: "q_mood", value: 4, note: null });
        expect(parsePsychContent("[q_mood] skip:bad — Tệ, không muốn nói")).toEqual({ qid: "q_mood", skip: "bad" });
        expect(parsePsychContent("[q_mood] skip:weird — ?")).toBeNull();
        expect(parsePsychContent("free text")).toBeNull();
    });
});

describe("buildPsychView", () => {
    const days = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    const weeks = ["2026-09-28", "2026-10-05"];
    const series: HabitSeriesDTO = {
        taskId: 1486, title: "x", projectId: 15, status: "background_progress",
        entries: [
            entry("2026-10-05", "09:00", "track", "[q_mood] 4 — D"),
            entry("2026-10-05", "15:00", "track", "[q_mood] 2 — B"),
            entry("2026-10-06", "10:00", "comment", "[q_mood] skip:bad — Tệ"),
            entry("2026-10-06", "20:00", "track", "[q_low] 3 — Very · deadline"),
            entry("2026-10-04", "19:30", "track", "[q_talk] 1 — Có"),
            entry("2026-10-06", "21:00", "track", "[q_unknown] 1 — ?"),
            entry("2026-10-06", "21:05", "track", "[q_low] 9 — out of range"),
        ],
    };

    it("groups answers/skips, averages per day and week, counts prompts", () => {
        const v = buildPsychView(series, parsePsychBank(html), days, weeks, "2026-10-06");
        const mood = v.questions.find((q) => q.id === "q_mood")!;
        expect(mood.answers.map((a) => a.value)).toEqual([4, 2]);
        expect(mood.dayAvg.find((d) => d.date === "2026-10-05")?.avg).toBe(3);
        expect(mood.skips).toEqual([{ at: "2026-10-06T10:00:00.000+07:00", date: "2026-10-06", reason: "bad" }]);
        expect(mood.weekAvg).toEqual([{ weekStart: "2026-09-28", avg: null }, { weekStart: "2026-10-05", avg: 3 }]);
        const low = v.questions.find((q) => q.id === "q_low")!;
        expect(low.latest).toMatchObject({ value: 3, label: "Very", note: "deadline" });
        const talk = v.questions.find((q) => q.id === "q_talk")!;
        expect(talk.dayAvg).toEqual([]);
        expect(talk.weekAvg[0].avg).toBe(1);
        expect(talk.labels).toEqual(["Không", "Có"]);
        // unknown question and out-of-range value are ignored
        expect(v.stats).toEqual({ asked: 5, answered: 4, skipped: { busy: 0, bad: 1, none: 0, today: 0 } });
        expect(psychLabel(mood, 3.4)).toBe("C");
    });
    it("no tracker data → empty questions, zero stats", () => {
        const v = buildPsychView(null, parsePsychBank(html), days, weeks, "2026-10-06");
        expect(v.questions.every((q) => q.answers.length === 0)).toBe(true);
        expect(v.stats.asked).toBe(0);
    });
});

describe("chart geometry", () => {
    it("streamLayout: one layer per group, labels never overlap", () => {
        const groups = [
            { key: "a", label: "Alpha", counts: [0, 10, 40, 10, 0, 5], total: 65, projects: [] },
            { key: "b", label: "Beta", counts: [5, 5, 5, 30, 30, 5], total: 80, projects: [] },
            { key: "c", label: "Gamma", counts: [0, 0, 1, 0, 0, 0], total: 1, projects: [] },
        ];
        const { layers, labels } = streamLayout(groups);
        expect(layers.map((l) => l.key)).toEqual(["a", "b", "c"]);
        expect(layers.every((l) => l.d.startsWith("M") && l.d.endsWith("Z") && !l.d.includes("NaN"))).toBe(true);
        expect(new Set(labels.map((l) => l.key)).size).toBe(labels.length);
        expect(streamLayout([])).toEqual({ layers: [], labels: [] });
    });
    it("linePaths: solid for consecutive days, dashed across a gap, dot per point", () => {
        const p = linePaths([3, 4, null, 2], 0, 3, (i) => i * 10, (v) => v);
        expect(p.n).toBe(3);
        expect(p.solid).toBe("M0.00,3.00L10.00,4.00M30.00,2.00");
        expect(p.dash).toBe("M10.00,4.00L30.00,2.00");
    });
    it("money format", () => {
        expect(fmtVndShort(245e6)).toBe("245 tr ₫");
        expect(fmtVndShort(1.25e9)).toBe("1,3 tỷ ₫");
        expect(fmtVndShort(-8.5e6, true)).toBe("−8,5 tr ₫");
        expect(fmtVndFull(12500000)).toBe("12.500.000 ₫");
    });
});
