import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_CREDIT_MS, REPORT_EVERY_MS, emptyUsage, formatUsage, sample, shouldReport, siteOf } from "../usage.js";

const at = (iso) => new Date(iso).getTime(); // local time (no Z)
const run = (start, steps) => steps.reduce((u, [iso, site]) => sample(u, at(iso), site).usage, emptyUsage(at(start)));

test("siteOf: FB / Ins / Messenger, còn lại null", () => {
    assert.equal(siteOf("https://www.facebook.com/"), "facebook");
    assert.equal(siteOf("https://m.facebook.com/groups/1"), "facebook");
    assert.equal(siteOf("https://www.facebook.com/messages/t/123"), "messenger");
    assert.equal(siteOf("https://www.messenger.com/t/1"), "messenger");
    assert.equal(siteOf("https://www.instagram.com/reels/"), "instagram");
    assert.equal(siteOf("https://notfacebook.com/"), null);
    assert.equal(siteOf("https://www.tungle.uk/"), null);
    assert.equal(siteOf("chrome://extensions"), null);
    assert.equal(siteOf("không phải url"), null);
});

test("sample: cộng thời gian kể từ mẫu trước cho site đang xem", () => {
    const u = run("2026-10-07T20:00:00", [
        ["2026-10-07T20:00:00", null],
        ["2026-10-07T20:01:00", "facebook"],
        ["2026-10-07T20:02:00", "facebook"],
        ["2026-10-07T20:03:00", "instagram"],
        ["2026-10-07T20:04:00", null], // chuyển sang VS Code / idle → không cộng
    ]);
    assert.equal(u.sec.facebook, 120);
    assert.equal(u.sec.instagram, 60);
});

test("sample: khoảng trống dài (máy ngủ) chỉ cộng tối đa MAX_CREDIT_MS", () => {
    const u = run("2026-10-07T20:00:00", [["2026-10-07T20:00:00", null], ["2026-10-07T21:00:00", "facebook"]]);
    assert.equal(u.sec.facebook, MAX_CREDIT_MS / 1000);
});

test("sample: qua ngày → trả ngày cũ để chốt, ngày mới bắt đầu từ 0", () => {
    const u = run("2026-10-07T23:58:00", [["2026-10-07T23:58:00", null], ["2026-10-07T23:59:00", "facebook"]]);
    const r = sample({ ...u, commentId: 77 }, at("2026-10-08T00:00:30"), "facebook");
    assert.equal(r.closed.day, "2026-10-07");
    assert.equal(r.closed.sec.facebook, 60);
    assert.equal(r.closed.commentId, 77);
    assert.equal(r.usage.day, "2026-10-08");
    assert.equal(r.usage.sec.facebook, 0);
    assert.equal(r.usage.commentId, null);
});

test("formatUsage: làm tròn phút, Messenger tách riêng không tính vào tổng", () => {
    const u = { ...emptyUsage(0), sec: { facebook: 42 * 60 + 10, instagram: 13 * 60, messenger: 8 * 60 } };
    assert.equal(formatUsage(u, "máy nhà"), "[fb_ins] FB 42' · Ins 13' · tổng 55' · Messenger 8' (không tính) · máy nhà · đo tự động");
    assert.equal(formatUsage(emptyUsage(0), ""), "[fb_ins] FB 0' · Ins 0' · tổng 0' · đo tự động");
});

test("shouldReport: chỉ khi số đổi, tối đa 10 phút/lần, trừ khi chốt ngày", () => {
    const now = at("2026-10-07T20:00:00");
    const u = { ...emptyUsage(now), reportedText: "a", reportedAt: now - 60000 };
    assert.equal(shouldReport(u, "a", now), false);
    assert.equal(shouldReport(u, "b", now), false);
    assert.equal(shouldReport(u, "b", now, true), true);
    assert.equal(shouldReport(u, "b", now - 60000 + REPORT_EVERY_MS), true);
    assert.equal(shouldReport(emptyUsage(now), "x", now), true); // lần đầu trong ngày gửi ngay
});
