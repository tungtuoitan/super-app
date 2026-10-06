/** Display formatting for the home page (vi-VN). Pure functions. */

/** 3.25 → "3,3" */
export const fmt1 = (v: number) => v.toFixed(1).replace(".", ",");

/** "2026-10-05" → "05/10" */
export const fmtDayMonth = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

/** VND short: 12,5 tr ₫ / 1,2 tỷ ₫; `sign` adds +/− */
export const fmtVndShort = (v: number, sign = false) => {
    const a = Math.abs(v);
    const s = a >= 1e9
        ? `${(a / 1e9).toFixed(1).replace(".", ",").replace(/,0$/, "")} tỷ ₫`
        : `${(a / 1e6).toFixed(1).replace(".", ",").replace(/,0$/, "")} tr ₫`;
    return (sign ? (v >= 0 ? "+" : "−") : "") + s;
};

/** VND exact: 12.500.000 ₫ */
export const fmtVndFull = (v: number) => `${v < 0 ? "−" : ""}${Math.round(Math.abs(v)).toLocaleString("vi-VN")} ₫`;

/** 1 = Monday … 7 = Sunday → "T2" … "CN" */
export const weekdayLabel = (isoWeekday: number) => (isoWeekday === 7 ? "CN" : `T${isoWeekday + 1}`);

/** 274 → "4:34" */
export const fmtCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** "2026-10-06T09:40:00+07:00" → "09:40" (wall-clock part of an ISO instant with offset) */
export const fmtClock = (iso: string) => iso.slice(11, 16);
