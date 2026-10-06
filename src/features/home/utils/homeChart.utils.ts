/**
 * Chart geometry for the home page (Claude Design v5, TungRoot #1481) — pure functions.
 * SVG coordinates: x 0..1000 (or 0..1400), y 0..100 in percent of the box; the UI scales them
 * with preserveAspectRatio="none".
 */

import type { ActivityGroupSeries, FinancePointView } from "../types/home.types";

type Pt = [number, number];
const f = (v: number) => v.toFixed(2);

/** Monotone cubic tangents (Fritsch–Carlson) — smooth curves that never overshoot. */
export function monoTangents(p: Pt[]): number[] {
    const n = p.length;
    const d: number[] = [];
    const m = new Array<number>(n).fill(0);
    if (n < 2) return m;
    for (let i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0] || 1));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) {
            m[i] = 0;
            m[i + 1] = 0;
            continue;
        }
        const a = m[i] / d[i];
        const b = m[i + 1] / d[i];
        const h = a * a + b * b;
        if (h > 9) {
            const t = 3 / Math.sqrt(h);
            m[i] = t * a * d[i];
            m[i + 1] = t * b * d[i];
        }
    }
    return m;
}

/** Closed area between a top and a bottom polyline, both smoothed. */
export function areaPath(top: Pt[], bot: Pt[]): string {
    const mt = monoTangents(top);
    const mb = monoTangents(bot);
    let s = `M${f(top[0][0])},${f(top[0][1])}`;
    for (let i = 0; i < top.length - 1; i++) {
        const [x0, y0] = top[i];
        const [x1, y1] = top[i + 1];
        const dx = (x1 - x0) / 3;
        s += `C${f(x0 + dx)},${f(y0 + mt[i] * dx)} ${f(x1 - dx)},${f(y1 - mt[i + 1] * dx)} ${f(x1)},${f(y1)}`;
    }
    const L = bot.length - 1;
    s += `L${f(bot[L][0])},${f(bot[L][1])}`;
    for (let i = L; i > 0; i--) {
        const [x1, y1] = bot[i];
        const [x0, y0] = bot[i - 1];
        const dx = (x1 - x0) / 3;
        s += `C${f(x1 - dx)},${f(y1 - mb[i] * dx)} ${f(x0 + dx)},${f(y0 + mb[i - 1] * dx)} ${f(x0)},${f(y0)}`;
    }
    return s + "Z";
}

export interface StreamLabel {
    key: string;
    text: string;
    /** Chip = small pill next to a thin layer (the label does not fit inside it) */
    chip: boolean;
    /** Percent of the box */
    x: number;
    y: number;
}

/**
 * Streamgraph with the "wiggle" baseline (Byron & Wattenberg) + label placement: inside the layer
 * where it is thick enough, otherwise a chip next to it; labels never overlap.
 */
export function streamLayout(groups: ActivityGroupSeries[]): { layers: { key: string; d: string }[]; labels: StreamLabel[] } {
    const v = groups.map((g) => g.counts);
    const n = v.length;
    const N = v[0]?.length ?? 0;
    if (!n || !N) return { layers: [], labels: [] };

    const y0 = new Array<number>(N).fill(0);
    for (let j = 1; j < N; j++) {
        let s1 = 0;
        let s2 = 0;
        for (let i = 0; i < n; i++) {
            const a = v[i][j];
            let s3 = (a - v[i][j - 1]) / 2;
            for (let k = 0; k < i; k++) s3 += v[k][j] - v[k][j - 1];
            s1 += a;
            s2 += s3 * a;
        }
        y0[j] = y0[j - 1] - (s1 ? s2 / s1 : 0);
    }
    const lows: number[][] = [];
    const ups: number[][] = [];
    let cum = y0.slice();
    for (let i = 0; i < n; i++) {
        lows.push(cum.slice());
        cum = cum.map((c, j) => c + v[i][j]);
        ups.push(cum.slice());
    }
    const lo = Math.min(...y0);
    const hi = Math.max(...cum);
    const span = hi - lo || 1;
    const X = (j: number) => ((j + 0.5) / N) * 1000;
    const Y = (val: number) => 4 + (1 - (val - lo) / span) * 92;
    const ext = (arr: number[]): Pt[] => [[0, Y(arr[0])], ...arr.map((a, j): Pt => [X(j), Y(a)]), [1000, Y(arr[N - 1])]];
    const layers = groups.map((g, i) => ({ key: g.key, d: areaPath(ext(ups[i]), ext(lows[i])) }));

    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const labels: StreamLabel[] = [];
    const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
        placed.some((p) => b.x < p.x + p.w && p.x < b.x + b.w && b.y < p.y + p.h && p.y < b.y + b.h);
    const order = groups.map((_, i) => i).sort((a, b) => Math.max(...v[b]) - Math.max(...v[a]));

    for (const i of order) {
        const g = groups[i];
        const cands = v[i].map((c, j) => [c, j]).sort((a, b) => b[0] - a[0]);
        for (const [c, j] of cands) {
            if ((c / span) * 92 < 7.5) break;
            const w = g.label.length * 0.82 + 1;
            const yc = (lows[i][j] + ups[i][j]) / 2;
            const need = (2.6 * span) / 92;
            let ok = true;
            for (const k of [j - 1, j + 1]) {
                if (k < 0 || k >= N) continue;
                const lo2 = (lows[i][j] + lows[i][k]) / 2;
                const up2 = (ups[i][j] + ups[i][k]) / 2;
                if (yc - lo2 < need || up2 - yc < need) ok = false;
            }
            if (!ok) continue;
            const x = Math.max(0.4, Math.min(99.6 - w, ((j + 0.5) / N) * 100 - w / 2));
            const y = Y(yc);
            const box = { x, y: y - 3.5, w, h: 7 };
            if (overlaps(box)) continue;
            placed.push(box);
            labels.push({ key: g.key, text: g.label, chip: false, x, y });
            break;
        }
    }
    const done = new Set(labels.map((l) => l.key));
    for (const i of order) {
        const g = groups[i];
        if (done.has(g.key)) continue;
        const w = g.label.length * 0.82 + 3.6;
        const cands = v[i].map((c, j) => [c, j]).filter(([c]) => c > 0).sort((a, b) => b[0] - a[0]);
        for (const [, j] of cands) {
            const x = Math.max(0.4, Math.min(99.6 - w, ((j + 0.5) / N) * 100 - 1));
            const y = Y((lows[i][j] + ups[i][j]) / 2);
            const box = { x, y: y - 4, w, h: 8 };
            if (overlaps(box)) continue;
            placed.push(box);
            labels.push({ key: g.key, text: g.label, chip: true, x, y });
            break;
        }
    }
    return { layers, labels };
}

/**
 * Line through daily averages: solid between consecutive days, dashed across gaps, a dot on every day.
 * `values[i]` belongs to column i; only columns fromIdx..toIdx are drawn.
 */
export function linePaths(values: (number | null)[], fromIdx: number, toIdx: number, X: (i: number) => number, Y: (v: number) => number) {
    const pts: [number, number][] = [];
    for (let i = Math.max(0, fromIdx); i <= Math.min(toIdx, values.length - 1); i++) {
        const v = values[i];
        if (v !== null && v !== undefined) pts.push([i, v]);
    }
    let solid = "";
    let dash = "";
    let dots = "";
    pts.forEach(([i, v], k) => {
        const p = `${f(X(i))},${f(Y(v))}`;
        dots += `M${p}l0.1,0`;
        if (k && i - pts[k - 1][0] === 1) solid += "L" + p;
        else {
            if (k) dash += `M${f(X(pts[k - 1][0]))},${f(Y(pts[k - 1][1]))}L${p}`;
            solid += "M" + p;
        }
    });
    return { solid, dash, dots, n: pts.length };
}

export interface FinanceLayer {
    key: string;
    label: string;
    color: string;
    /** First point index where the layer has value (later start = account connected later) */
    start: number;
    d: string;
}

const ACCOUNT_COLORS: Record<string, string> = { Binance: "#f2b54b", BIDV: "#8a8a90" };
const OTHER_COLORS = ["#6e6e74", "#5e5e64", "#4e4e54"];
export const DEBT_KEY = "debt";

/** Value of one layer at a point. */
export const layerValue = (p: FinancePointView, key: string) => (key === DEBT_KEY ? p.debt : p.accounts[key] ?? 0);

/**
 * Stacked areas per account (Binance, BIDV, others, then lent money) + the net-worth line.
 * Returns a "nice" y max and grid step so labels read 50 tr / 100 tr…
 */
export function financeChart(series: FinancePointView[]) {
    const n = series.length;
    const t0 = Date.parse(series[0].date);
    const t1 = Date.parse(series[n - 1].date);
    const X = (date: string) => (t1 === t0 ? 1000 : ((Date.parse(date) - t0) / (t1 - t0)) * 1000);
    const maxT = Math.max(1, ...series.map((p) => p.total));
    const step = maxT > 150e6 ? 50e6 : maxT > 30e6 ? 25e6 : Math.max(1e6, Math.ceil(maxT / 4 / 1e6) * 1e6);
    const top = Math.ceil((maxT * 1.06) / step) * step;
    const Y = (v: number) => 100 - (v / top) * 100;

    const accountKeys = Array.from(new Set(series.flatMap((p) => Object.keys(p.accounts))));
    const known = ["Binance", "BIDV"].filter((k) => accountKeys.includes(k));
    const others = accountKeys.filter((k) => !known.includes(k));
    const order: { key: string; label: string; color: string }[] = [
        ...known.map((k) => ({ key: k, label: k, color: ACCOUNT_COLORS[k] })),
        ...others.map((k, i) => ({ key: k, label: k, color: OTHER_COLORS[i % OTHER_COLORS.length] })),
        { key: DEBT_KEY, label: "Cho mượn", color: "#55555a" },
    ];

    let cum = series.map(() => 0);
    const layers: FinanceLayer[] = [];
    const startAdd: Record<number, number> = {};
    for (const { key, label, color } of order) {
        const vals = series.map((p) => Math.max(0, layerValue(p, key)));
        const idx = vals.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        if (!idx.length) continue;
        const s = idx[0];
        const e = idx[idx.length - 1];
        const topA = cum.map((c, i) => c + vals[i]);
        if (s > 0) startAdd[s] = (startAdd[s] || 0) + vals[s];
        let d = `M${f(X(series[s].date))},${f(Y(cum[s]))}`;
        for (let i = s; i <= e; i++) d += `L${f(X(series[i].date))},${f(Y(topA[i]))}`;
        for (let i = e; i >= s; i--) d += `L${f(X(series[i].date))},${f(Y(cum[i]))}`;
        layers.push({ key, label, color, start: s, d: d + "Z" });
        cum = topA;
    }
    let line = "";
    series.forEach((p, i) => {
        const x = f(X(p.date));
        if (!i) {
            line = `M${x},${f(Y(p.total))}`;
            return;
        }
        if (startAdd[i]) line += `L${x},${f(Y(p.total - startAdd[i]))}`;
        line += `L${x},${f(Y(p.total))}`;
    });
    const grid: number[] = [];
    for (let v = 0; v <= top; v += step) grid.push(v);
    return { layers, line, grid, X, Y, xs: series.map((p) => X(p.date) / 10) };
}
