import { applyTimelineDrag, resolveTimelineSpan } from "./multiTimelineSpan.utils";

const d = (s: string) => new Date(`${s}T00:00:00`);
const iso = (date: Date | null) => (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : null);
const timelineEnd = d("2027-03-31");

describe("resolveTimelineSpan", () => {
    test("real start + end", () => {
        const span = resolveTimelineSpan({ startDate: d("2026-10-01"), endDate: d("2026-10-10") }, timelineEnd, false)!;
        expect([iso(span.start), iso(span.end), span.isOpenEnded, span.isStartEstimated]).toEqual(["2026-10-01", "2026-10-10", false, false]);
    });

    test("only end → 1-day bar", () => {
        const span = resolveTimelineSpan({ endDate: d("2026-10-10") }, timelineEnd, false)!;
        expect([iso(span.start), iso(span.end), span.isOpenEnded]).toEqual(["2026-10-10", "2026-10-10", false]);
    });

    test("open item without end runs to timeline end", () => {
        const span = resolveTimelineSpan({ startDate: d("2026-10-01") }, timelineEnd, false)!;
        expect([iso(span.start), iso(span.end), span.isOpenEnded]).toEqual(["2026-10-01", "2027-03-31", true]);
    });

    test("no dates → starts at createdAt, open-ended", () => {
        const span = resolveTimelineSpan({ createdAt: new Date("2026-08-15T09:30:00") }, timelineEnd, false)!;
        expect([iso(span.start), iso(span.end), span.isStartEstimated, span.isOpenEnded]).toEqual(["2026-08-15", "2027-03-31", true, true]);
    });

    test("closed item without end stops at updatedAt", () => {
        const span = resolveTimelineSpan({ createdAt: d("2026-08-01"), updatedAt: d("2026-09-20") }, timelineEnd, true)!;
        expect([iso(span.start), iso(span.end), span.isEndEstimated, span.isOpenEnded]).toEqual(["2026-08-01", "2026-09-20", true, false]);
    });

    test("nothing usable → null", () => {
        expect(resolveTimelineSpan({}, timelineEnd, false)).toBeNull();
    });
});

describe("applyTimelineDrag", () => {
    const undated = { createdAt: d("2026-08-15") };
    const span = resolveTimelineSpan(undated, timelineEnd, false)!;

    test("move an undated open item → start becomes real, end stays open", () => {
        const r = applyTimelineDrag(undated, span, "move", 7, 0);
        expect([iso(r.startDate), iso(r.endDate)]).toEqual(["2026-08-22", null]);
    });

    test("resize-left keeps the end open", () => {
        const r = applyTimelineDrag(undated, span, "resize-left", -3, 3);
        expect([iso(r.startDate), iso(r.endDate)]).toEqual(["2026-08-12", null]);
    });

    test("resize-right pulls the open end back to a real end date", () => {
        const r = applyTimelineDrag(undated, span, "resize-right", 0, -30);
        expect([iso(r.startDate), iso(r.endDate)]).toEqual(["2026-08-15", "2027-03-01"]);
    });

    test("only-end item keeps start empty on move", () => {
        const item = { endDate: d("2026-10-10") };
        const r = applyTimelineDrag(item, resolveTimelineSpan(item, timelineEnd, false)!, "move", 2, 0);
        expect([iso(r.startDate), iso(r.endDate)]).toEqual([null, "2026-10-12"]);
    });
});
