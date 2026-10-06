import { useMemo } from "react";
import { useHomeSelector } from "./useHome.selector";
import { streamLayout } from "../utils/homeChart.utils";
import { fmtDayMonth } from "../utils/homeFormat.utils";

const DAY_MS = 864e5;
const MARK_SHORT_MAX = 26;

/** Short pill text for a timeline mark: the part before ":" or the first words. */
const shortNote = (note: string) => {
    const head = note.split(/[:\n]/)[0].trim();
    return head.length > MARK_SHORT_MAX ? `${head.slice(0, MARK_SHORT_MAX - 1)}…` : head;
};

/** Activity streamgraph: layers, labels, month ticks and timeline marks (x in % of the 30-week axis). */
export const useHomeActivitySelector = () => {
    const { activityView, timelineMarks } = useHomeSelector();
    const { weeks, groups } = activityView;
    const N = weeks.length;

    const layout = useMemo(() => streamLayout(groups), [groups]);

    const monthTicks = useMemo(
        () => weeks
            .map((w, j) => ({ w, j }))
            .filter(({ w, j }) => j === 0 || w.slice(5, 7) !== weeks[j - 1].slice(5, 7))
            .map(({ w, j }) => ({ key: w, label: `T${parseInt(w.slice(5, 7), 10)}`, left: (j / N) * 100 })),
        [weeks, N],
    );

    const marks = useMemo(
        () => timelineMarks
            .map((m) => ({
                key: `${m.date}-${m.note.length}`,
                title: `${fmtDayMonth(m.date)} · ${m.note}`,
                short: shortNote(m.note),
                x: ((Date.parse(m.date) - Date.parse(weeks[0])) / DAY_MS / 7 / N) * 100,
            }))
            .filter((m) => m.x >= 0 && m.x <= 100),
        [timelineMarks, weeks, N],
    );

    return { weeks, groups, N, layers: layout.layers, labels: layout.labels, monthTicks, marks };
};
