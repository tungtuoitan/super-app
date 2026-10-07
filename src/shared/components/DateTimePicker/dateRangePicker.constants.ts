/**
 * DateRangePicker constants (#1514 — moved out of DateRangePicker.tsx, unchanged)
 */

// Quick date options for single date selection
export const QUICK_DATE_OPTIONS = [
    { label: "Today", getValue: () => new Date() },
    { label: "Tomorrow", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
    }},
    { label: "In 3 days", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d;
    }},
    { label: "In 1 week", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
    }},
    { label: "In 2 weeks", getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
    }},
    { label: "In 1 month", getValue: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d;
    }},
];
