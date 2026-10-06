import { test } from "node:test";
import assert from "node:assert/strict";
import {
    applyOutcome, canPrompt, currentGapMinutes, emptyState, formatComment, isValidAnswer,
    markShown, parseBank, pickQuestion, rollDay, weekKey,
} from "../scheduler.js";

const at = (iso) => new Date(iso).getTime(); // local time (no Z)

const bank = parseBank(`<p>x</p><pre class="rich-text-codeblock"><code class="language-json">${JSON.stringify({
    questions: [
        { id: "tam_trang", text: "Tâm trạng?", type: "scale", min: 1, max: 5, labels: ["Tệ", "Hơi tệ", "Bình thường", "Tốt", "Rất tốt"], frequency: "daily" },
        { id: "chan_nan", text: "Chán?", type: "scale", min: 0, max: 3, labels: ["Không", "Hơi", "Khá", "Nặng"], frequency: "daily", from: "14:00" },
        { id: "ky_luat", text: "Plan?", type: "scale", min: 1, max: 5, frequency: "daily", from: "19:00" },
        { id: "so_mat_viec", text: "Lo mất việc?", type: "scale", min: 0, max: 3, frequency: "weekly", fromWeekday: 5 },
        { id: "ket_noi", text: "Kết nối?", type: "yesno", frequency: "weekly", fromWeekday: 5 },
    ],
}).replace(/"/g, "&quot;")}</code></pre>`);

const fresh = (now) => rollDay(emptyState(), now);

test("parseBank: đọc JSON trong <pre><code> (đã escape HTML) + điền mặc định", () => {
    assert.equal(bank.questions.length, 5);
    assert.equal(bank.maxPerDay, 3);
    assert.equal(bank.minGapMinutes, 120);
    assert.throws(() => parseBank("<p>không có code</p>"), /JSON/);
    assert.throws(() => parseBank('<pre><code>{"questions":[{"id":"a","text":"x","type":"scale","min":3,"max":1}]}</code></pre>'), /Thang/);
    assert.throws(() => parseBank('<pre><code>{"questions":[{"id":"a","text":"x","type":"yesno"},{"id":"a","text":"y","type":"yesno"}]}</code></pre>'), /Trùng/);
});

test("giờ hoạt động + cửa sổ giờ của câu hỏi", () => {
    assert.equal(canPrompt(fresh(at("2026-10-06T07:30")), bank, at("2026-10-06T07:30")).ok, false);
    const morning = at("2026-10-06T09:00"); // Tuesday
    assert.equal(pickQuestion(fresh(morning), bank, morning).id, "tam_trang", "sáng chỉ có câu không giới hạn giờ");
    const evening = at("2026-10-06T19:30");
    assert.equal(pickQuestion(fresh(evening), bank, evening).id, "ky_luat", "tối: ưu tiên câu cửa sổ muộn nhất");
    assert.equal(canPrompt(fresh(at("2026-10-06T22:45")), bank, at("2026-10-06T22:45")).ok, false);
});

test("tối đa 3 câu/ngày, cách nhau >= 2h; 'để sau' không tính và quay lại sau 45 phút", () => {
    let now = at("2026-10-06T15:00");
    let s = fresh(now);
    for (let i = 0; i < 3; i++) {
        assert.equal(canPrompt(s, bank, now).ok, true, `câu ${i + 1}`);
        const q = pickQuestion(s, bank, now);
        s = markShown(s, q.id, `p${i}`, 1, now);
        assert.equal(canPrompt(s, bank, now).ok, false, "đang hiện câu hỏi");
        if (i === 0) {
            s = applyOutcome(s, bank, q.id, { kind: "skip", reason: "later" }, now);
            assert.equal(s.count, 0, "để sau không tính");
            assert.equal(canPrompt(s, bank, now + 30 * 60000).ok, false, "chưa hết 45 phút");
            now += 46 * 60000;
            assert.equal(pickQuestion(s, bank, now).id, q.id, "câu snooze quay lại, bỏ qua khoảng cách 2h");
            assert.equal(canPrompt(s, bank, now).ok, true);
            s = markShown(s, q.id, "p0b", 1, now);
        }
        s = applyOutcome(s, bank, s.active.qid, { kind: "answer", value: 3 }, now);
        assert.equal(canPrompt(s, bank, now + 60 * 60000).ok, false, "chưa đủ 2h");
        now += 121 * 60000;
    }
    assert.equal(s.count, 3);
    const r = canPrompt(s, bank, at("2026-10-06T22:00"));
    assert.equal(r.ok, false);
    assert.match(r.reason, /Đủ 3/);
    assert.equal(rollDay(s, at("2026-10-07T09:00")).count, 0, "sang ngày mới reset");
});

test("không phản hồi → giãn khoảng cách; tương tác lại → về 2h", () => {
    const now = at("2026-10-06T15:00");
    let s = markShown(fresh(now), "chan_nan", "p", 1, now);
    s = applyOutcome(s, bank, "chan_nan", { kind: "skip", reason: "none" }, now);
    assert.equal(s.ignoredStreak, 1);
    assert.equal(currentGapMinutes(s, bank), 240);
    assert.equal(canPrompt(s, bank, now + 150 * 60000).ok, false, "2.5h < 4h");
    s = markShown(s, "tam_trang", "p2", 1, now + 241 * 60000);
    s = applyOutcome(s, bank, "tam_trang", { kind: "skip", reason: "busy" }, now + 241 * 60000);
    assert.equal(s.ignoredStreak, 0);
    assert.equal(s.count, 2, "busy và none đều tính vào 3 câu");
});

test("tắt hôm nay", () => {
    const now = at("2026-10-06T10:00");
    let s = markShown(fresh(now), "tam_trang", "p", 1, now);
    s = applyOutcome(s, bank, "tam_trang", { kind: "skip", reason: "today" }, now);
    assert.match(canPrompt(s, bank, now + 5 * 3600000).reason, /tắt hôm nay/);
    assert.equal(canPrompt(rollDay(s, at("2026-10-07T10:00")), bank, at("2026-10-07T10:00")).ok, true, "mai bật lại");
});

test("câu tuần: từ thứ 6, mỗi ngày 1 câu (CN hỏi nốt), trả lời rồi thì hết tuần", () => {
    const thu = at("2026-10-08T10:00");
    assert.equal(pickQuestion(fresh(thu), bank, thu).id, "tam_trang", "thứ 5 chưa hỏi câu tuần");
    const fri = at("2026-10-09T10:00");
    let s = fresh(fri);
    assert.equal(pickQuestion(s, bank, fri).id, "so_mat_viec");
    s = applyOutcome(markShown(s, "so_mat_viec", "p", 1, fri), bank, "so_mat_viec", { kind: "answer", value: 1 }, fri);
    assert.equal(s.weeklyDone.so_mat_viec, weekKey(fri));
    assert.equal(pickQuestion(s, bank, fri + 3 * 3600000).id, "tam_trang", "đã hỏi 1 câu tuần hôm nay");
    const sun = at("2026-10-11T10:00");
    s = rollDay(s, sun);
    s = applyOutcome(markShown(s, "ket_noi", "p", 1, sun), bank, "ket_noi", { kind: "skip", reason: "busy" }, sun);
    assert.notEqual(s.weeklyDone.ket_noi, weekKey(sun), "bận → tuần sau/hôm khác hỏi lại");
    const nextMon = at("2026-10-12T10:00");
    assert.equal(pickQuestion(rollDay(s, nextMon), bank, nextMon).id, "tam_trang", "T2 tuần mới chưa tới câu tuần");
});

test("format comment + validate", () => {
    const [tam, chan, , , ketNoi] = bank.questions;
    assert.deepEqual(formatComment(chan, { kind: "answer", value: 2, note: "  họp\n dài " }), { type: "track", content: "[chan_nan] 2 — Khá · họp dài" });
    assert.deepEqual(formatComment(ketNoi, { kind: "answer", value: 1 }), { type: "track", content: "[ket_noi] 1 — Có" });
    assert.deepEqual(formatComment(tam, { kind: "skip", reason: "bad" }), { type: "comment", content: "[tam_trang] skip:bad — Tệ, không muốn nói" });
    assert.equal(formatComment(tam, { kind: "skip", reason: "later" }), null);
    assert.equal(isValidAnswer(chan, 3), true);
    assert.equal(isValidAnswer(chan, 4), false);
    assert.equal(isValidAnswer(ketNoi, 2), false);
    assert.equal(isValidAnswer(tam, 2.5), false);
});
