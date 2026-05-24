/**
 * config.js — k6 shared config
 *
 * All env vars come in via -e flags from run.ps1 (k6 cannot read .env directly).
 */

export const BASE_URL      = __ENV.BASE_URL      || "http://localhost:5000";
export const USER_COUNT    = parseInt(__ENV.USER_COUNT    || "1000", 10);
export const EMAIL_PREFIX  = __ENV.EMAIL_PREFIX  || "loadtest+";
export const EMAIL_DOMAIN  = __ENV.EMAIL_DOMAIN  || "test.local";
export const PASSWORD      = __ENV.PASSWORD      || "LoadTest@123";

export const VUS           = parseInt(__ENV.VUS           || "1000", 10);
export const RAMP_UP       = __ENV.RAMP_UP       || "2m";
export const STEADY        = __ENV.STEADY        || "5m";
export const RAMP_DOWN     = __ENV.RAMP_DOWN     || "1m";

export function emailForVU(vu) {
    const idx = ((vu - 1) % USER_COUNT) + 1;
    const padded = String(idx).padStart(4, "0");
    return `${EMAIL_PREFIX}${padded}@${EMAIL_DOMAIN}`;
}
