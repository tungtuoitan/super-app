# SRS — Spaced Repetition System

Hệ thống ôn tập lặp lại theo thuật toán SM-2, áp dụng cho từng **câu hỏi** (k.question).

---

## 1. Thang điểm (Score 0–5)

Sau mỗi lần trả lời, AI chấm điểm 0–5:

| Score | Ý nghĩa | SRS |
|-------|---------|-----|
| **0–2** | Fail nặng | Reset, ôn lại sau **1 giờ** |
| **3** | Fail vừa | Reset, ôn lại **ngày mai** |
| **4** | Khá | Pass — interval tăng |
| **5** | Tốt | Pass — interval tăng |

---

## 2. SM-2 Algorithm

Mỗi câu hỏi có 4 giá trị SRS:

| Field | Mặc định | Ý nghĩa |
|-------|----------|---------|
| `SrsInterval` | 0 | Khoảng cách giữa các lần ôn (ngày) |
| `SrsEaseFactor` | 2.5 | Hệ số dễ — tăng nếu trả lời tốt, giảm nếu kém |
| `SrsRepetitions` | 0 | Số lần pass liên tiếp |
| `SrsNextReviewAt` | null | Thời điểm cần ôn tiếp |

### Sau mỗi lần review:

**Nếu fail (score ≤ 2):**
```
repetitions = 0
interval = 0
nextReview = now + 1 giờ
```

**Nếu fail vừa (score = 3):**
```
repetitions = 0
interval = 1
nextReview = now + 1 ngày
```

**Nếu pass (score ≥ 4):**
```
Lần 1 (repetitions = 0): interval = 1 ngày
Lần 2 (repetitions = 1): interval = 6 ngày
Lần 3+:                   interval = interval × easeFactor
repetitions += 1
nextReview = now + interval ngày
```

**Ease factor luôn được cập nhật:**
```
easeFactor += 0.1 - (5 - score) × (0.08 + (5 - score) × 0.02)
easeFactor = max(1.3, easeFactor)
```

### Ví dụ progression (luôn score 5):

| Lần | Interval | EaseFactor | Next Review |
|-----|----------|------------|-------------|
| 1 | 1 ngày | 2.6 | +1 ngày |
| 2 | 6 ngày | 2.7 | +6 ngày |
| 3 | 16 ngày | 2.8 | +16 ngày |
| 4 | 45 ngày | 2.9 | +45 ngày |

### Ví dụ progression (score 4):

| Lần | Interval | EaseFactor | Next Review |
|-----|----------|------------|-------------|
| 1 | 1 ngày | 2.5 | +1 ngày |
| 2 | 6 ngày | 2.5 | +6 ngày |
| 3 | 15 ngày | 2.5 | +15 ngày |
| 4 | 38 ngày | 2.5 | +38 ngày |

---

## 3. Daily Review — Chọn câu hỏi

Mỗi session lấy tối đa **30 câu** từ 1 test:

| Loại | Tỉ lệ | Điều kiện |
|------|--------|-----------|
| **Due** (đến hạn) | 60% | `SrsNextReviewAt ≤ now` |
| **New** (chưa ôn) | 40% | `SrsNextReviewAt = null` |

Nếu thiếu bên nào thì bù từ bên kia.

Chỉ lấy từ test có `status = "learning"` hoặc `"mastered"`.

---

## 4. Chủ động ôn (Start Test từ Kanban)

Khi ôn chủ động (không qua Daily Review), kết quả **cũng cập nhật SRS** — cùng logic SM-2 như Daily Review. Tức là:

- Score tốt → đẩy nextReview xa hơn
- Score kém → reset, ôn lại sớm

---

## 5. Auto Promote / Regress

| Chuyển | Điều kiện |
|--------|-----------|
| `learning` → `mastered` | 5 session gần nhất **tất cả** có avgPoint > 4.5 **và** avgSpeedRatio < 1.0 |
| `mastered` → `learning` | Bất kỳ session nào trong 5 gần nhất **không** đạt điều kiện trên |

`speedRatio = responseTimeMs / readingTimeMs` (readingTimeMs = wordCount / 3.33 × 1000)

---

## 6. Retention — Độ nhớ

### Công thức

```
R = 0.9 ^ (daysSinceLastReview / interval) × 100%
```

Trong đó:
- `lastReview = SrsNextReviewAt - interval ngày`
- `daysSinceLastReview = now - lastReview`

### Ý nghĩa

| Thời điểm | R |
|-----------|---|
| Vừa ôn xong | 100% |
| Đúng hạn review (daysSince = interval) | 90% |
| Gấp đôi interval | 81% |
| Gấp 5 interval | 59% |

**90%** là ngưỡng mà SM-2 lên lịch ôn lại — khi R xuống 90%, đó là lúc cần review.

### Đặc điểm

- Interval lớn → decay chậm hơn. Cùng quá hạn 2 ngày:
  - interval = 1 ngày → R ≈ 73%
  - interval = 30 ngày → R ≈ 99.3%
- Chưa ôn lần nào (`SrsNextReviewAt = null`) → R = 0%
- Interval = 0 (vừa fail nặng) → R = 0%

### Retention của 1 ngày cụ thể

Để tính retention tại một ngày bất kỳ trong quá khứ, cần **replay lịch sử SM-2**:

1. Lấy toàn bộ `point_history` của câu hỏi, sắp xếp theo `createdAt` tăng dần
2. Replay SM-2 từ đầu: mỗi record → `CalculateNext(score, currentState)` → ghi nhận `(reviewDate, interval)`
3. Tại ngày cần tính, tìm lần review gần nhất **trước** ngày đó
4. Tính: `R = 0.9 ^ (daysSinceReview / interval) × 100%`
5. Nếu chưa review lần nào trước ngày đó → R = 0%

### Retention trung bình của knowledge

```
R_avg = Σ(R_i × 1) / N
```

Với N = tổng số câu hỏi active, R_i = retention của câu hỏi i.

Hiển thị bên phải tab bar trong Knowledge Editor, kèm graph 14 ngày.

---

## 7. Files

| File | Vai trò |
|------|---------|
| `SpacedRepetitionEngine.cs` | SM-2 algorithm, CalculateRetention |
| `KTestService.cs` | SubmitAnswers, SubmitDailyAnswers, GetRetentionSummary, GetRetentionGraph |
| `KTestRepository.cs` | Query questions, point_history, SRS update |
| `KQuestionEntity.cs` | SrsInterval, SrsEaseFactor, SrsRepetitions, SrsNextReviewAt |
| `KRetentionResponse.cs` | DTO: KRetentionSummaryResponse, KRetentionGraphResponse |
| `KRetentionBadge.tsx` | Frontend: retention badge + graph popup |
| `QuestionScoreBar.tsx` | Frontend: per-question score bars + retention % |
