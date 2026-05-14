---
name: sa-srs-k
description: SRS (Spaced Repetition System) cho K module — SM-2 algorithm, Daily Review UI, scoring, retention.
---

# SRS — K Module (Spaced Repetition System)

SM-2 spaced repetition applied per **question** (k.question).

> **Note on master state**: `q.status_code` is `"learning" | "draft"` only — there is no `"mastered"` value stored in DB. "Master" is **derived** at read time from `k.point_history`: a question is master at date D when its 10 most recent answers (with `created_at ≤ D`) all have `point ≥ 5`. This is computed in the dashboard timeline endpoint (see [knowledge-dashboard](knowledge-dashboard) skill). The legacy `ApplyStatusTransitionsAsync` method has been removed.

---

## 1. Score Scale

Daily Review uses **self-graded 5 levels** (no AI):

| Score | Button | SRS effect |
|-------|--------|------------|
| **1** | Again  | Reset — review in **30 min** |
| **2** | Hard   | Reset — review in **2 hours** |
| **3** | Okay   | Reset — review in **4 hours** |
| **4** | Good   | Advance interval (SM-2) |
| **5** | Easy   | Advance interval (SM-2, same as 4) |

Scores 1–3 reset repetitions to 0 and set a short retry delay.  
Scores 4–5 advance the SM-2 interval and increment repetitions.

> Buttons show **label only** — no preview interval time displayed in the UI.

---

## 2. SM-2 Algorithm

Each question has 4 SRS fields (`KQuestionEntity.cs`):

| Field | Default | Meaning |
|-------|---------|---------|
| `SrsInterval` | 0 | Days between reviews |
| `SrsEaseFactor` | 2.5 | Ease multiplier — goes up on good scores, down on bad |
| `SrsRepetitions` | 0 | Consecutive passes |
| `SrsNextReviewAt` | null | Next scheduled review datetime |

### `SpacedRepetitionEngine.cs` → `CalculateNext(score, state)`:

**Scores 1–3 (reset path):**
```
repetitions = 0
interval    = 0
nextReview  = now + delay   // 30 min | 2 h | 4 h
```

**Scores 4–5 (advance path):**
```
rep 0 → interval = 1 day
rep 1 → interval = 6 days
rep 2+ → interval = round(interval × easeFactor)
repetitions += 1
nextReview = now + interval days
```

**Ease factor (applied after every review):**
```
easeFactor += 0.1 - (5 - score) × (0.08 + (5 - score) × 0.02)
easeFactor  = max(1.3, easeFactor)
```
Score 1 → largest decrease; Score 5 → increase of +0.1.

### Example progression (always score 5):

| Rep | Interval | EaseFactor | Next Review |
|-----|----------|------------|-------------|
| 1 | 1 day    | 2.60 | +1 day |
| 2 | 6 days   | 2.70 | +6 days |
| 3 | 16 days  | 2.80 | +16 days |
| 4 | 45 days  | 2.90 | +45 days |

---

## 3. Daily Review — Question Selection

Each session pulls up to **30 questions** from a node:

| Type | Ratio | Condition |
|------|-------|-----------|
| **Due** | 60% | `SrsNextReviewAt ≤ now` |
| **New** | 40% | `SrsNextReviewAt = null` |

If one bucket is short, the other fills in. Only from nodes with `status = "learning"`.

---

## 4. Retention

### Formula (`SpacedRepetitionEngine.cs` → `CalculateRetention`):

```
R = 0.9 ^ (daysSinceLastReview / interval) × 100%
```

Where:
- `lastReview = SrsNextReviewAt − interval days`
- `daysSinceLastReview = now − lastReview`

### Reference values:

| When | R |
|------|---|
| Just reviewed | 100% |
| At due date (daysSince = interval) | 90% |
| 2× interval | 81% |
| 5× interval | 59% |

Edge cases:
- Never reviewed (`SrsNextReviewAt = null`) → R = 0%
- Interval = 0 (just failed) → R = 0%

### Retention at a specific date (for graph):

1. Fetch all `point_history` sorted by `createdAt` ascending
2. Replay SM-2 from start: each record → `CalculateNext(score, state)` → record `(reviewDate, interval)`
3. For target date, find the most recent review **before** that date
4. Apply: `R = 0.9 ^ (daysSince / interval) × 100%`

---

## 5. Frontend — Daily Review UI

**File:** `src/features/K/Components/KDailyReviewSession.tsx`

### Props

```ts
interface KDailyReviewSessionProps {
    knowledgeId: number;
    quizTitle: string;
    questions: KDailySessionQuestion[];  // pre-sorted by topoSortByFlow
    onComplete: () => void;
    onBack: () => void;
    isQuickQuiz?: boolean;
}
```

### Flow

1. Show question; answer is **blurred** (`filter: blur(7px)`)
2. Tap anywhere → reveal answer → score buttons fade in
3. Click score button → `advanceWithScore(score)` → next question
4. After last question → `isSubmitted = true` → Summary screen → `Done` → `onComplete()`

### Score buttons

```ts
const SCORE_BUTTONS = [
    { score: 1, label: "Again",  btnClass: "border-red-600/50 text-red-400 ..." },
    { score: 2, label: "Hard",   btnClass: "border-orange-500/40 text-orange-400 ..." },
    { score: 3, label: "Okay",   btnClass: "border-yellow-500/40 text-yellow-400 ..." },
    { score: 4, label: "Good",   btnClass: "border-green-400/40 text-green-400 ..." },
    { score: 5, label: "Easy",   btnClass: "border-green-500/40 text-green-400 ..." },
] as const;
```

Buttons show **label only** — no time interval displayed.

### Draft button

- Click → `KQuizService._markQuestionDraft(knowledgeId, qId)` then skip question
- Uses `e.stopPropagation()` to avoid triggering reveal
- Drafted questions tracked in `draftedIdsRef`, excluded from submit payload

### Submit (fire-and-forget)

```ts
const dailyAnswers: KDailyAnswerItem[] = questions
    .filter(q => !draftedIdsRef.current.has(q.id))
    .map(q => ({
        questionId: q.id,
        answerText: null,
        responseTimeMs: timingsSnap[q.id] ?? null,
        selfScore: scoresSnap[q.id] ?? null,
    }));
KQuizService._submitDailyAnswers(knowledgeId, { answers: dailyAnswers });
```

Silent — does not block UI. Skipped if `isQuickQuiz = true`.

### Question ordering

Caller must pre-sort using `sortQuestionsByFlowOrder` (topo DFS by edge direction):

```ts
// src/features/K/utils/kQFlow.utils.ts
const sorted = await sortQuestionsByFlowOrder(rawQuestions);
```

### Drag-to-score *(disabled)*

Implemented but turned off (`onPointerDown` commented out, overlay guarded by `{false && ...}`):

```ts
// → = 5, ← = 0, ↑ = 3, ↓ = cancel
// start threshold: 20px, commit threshold: 40px
```

---

## 6. Backend Files

| File | Role |
|------|------|
| `SpacedRepetitionEngine.cs` | SM-2: `CalculateNext`, `CalculateRetention`, `CalculateRetentionAtDate` |
| `KQuestionService.cs` | `SubmitDailyAnswersAsync`, `GetRetentionSummaryAsync`, `GetRetentionGraphAsync` |
| `KQuestionRepository.cs` | Question queries, point_history, SRS field writes |
| `KQuestionEntity.cs` | `SrsInterval`, `SrsEaseFactor`, `SrsRepetitions`, `SrsNextReviewAt` |
| `KDailySubmitRequest.cs` | DTO: `Answers[]`, `ResponseTimeMs`, `SelfScore` (1–5) |
| `KRetentionGraphResponse.cs` | DTO: `KRetentionSummaryResponse`, `KRetentionGraphResponse` |

---

## Task

{{USER_TASK}}
