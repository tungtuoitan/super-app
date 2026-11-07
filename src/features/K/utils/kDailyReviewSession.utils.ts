// Score from the velocity of the last ~100ms of drag — direction + speed of the final gesture.
//   px/frame values at 60 fps (1 frame ≈ 16ms):
//   ↑ ≥ 3  = 4 Good   |  ↑ ≥ 15 = 5 Easy   (need a strong throw for Easy)
//   ↓ ≥ 3  = 2 Hard   |  ↓ ≥ 18 = 1 Again  (need a very strong throw for Again)
//   horizontal dominant ≥ 5 = 3 Okay
export function scoreFromSamples(samples: { x: number; y: number; t: number }[]): number | null {
    if (samples.length < 2) return null;
    const tail = samples[samples.length - 1];
    const ref  = samples.find(s => s.t >= tail.t - 100) ?? samples[0];
    const dt   = Math.max(8, tail.t - ref.t);
    const vx   = ((tail.x - ref.x) / dt) * 16;  // px per frame
    const vy   = ((tail.y - ref.y) / dt) * 16;
    const avx  = Math.abs(vx);
    const avy  = Math.abs(vy);
    if (avx > avy * 1.3 && avx >= 5)  return 3;  // Okay
    if (vy < 0 && avy >= 15)           return 5;  // Easy  (strong fast up)
    if (vy < 0 && avy >= 3)            return 4;  // Good  (gentle up)
    if (vy > 0 && avy >= 18)           return 1;  // Again (very strong down)
    if (vy > 0 && avy >= 3)            return 2;  // Hard  (gentle down)
    return null;
}

export function fmtInterval(seconds: number): string {
    if (seconds < 3600)           return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400)          return `${Math.round(seconds / 3600)}h`;
    if (seconds < 86400 * 30)     return `${Math.round(seconds / 86400)}d`;
    if (seconds < 86400 * 365)    return `${Math.round(seconds / (86400 * 30))}mo`;
    return `${Math.round(seconds / (86400 * 365))}y`;
}
