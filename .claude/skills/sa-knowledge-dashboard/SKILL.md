---
name: sa-knowledge-dashboard
description: Context and architecture for the KProgressDashboard — stat cards, charts, retention per node, question state timeline, master logic.
---

# Knowledge Progress Dashboard

Context for working on the **Progress tab** of the K (Knowledge) module.

---

## Key Files

| Layer | Path |
|-------|------|
| Dashboard UI | `C:\Users\Admin\source\SuperApp\src\features\K\Components\KProgressDashboard.tsx` |
| Retention chart | `C:\Users\Admin\source\SuperApp\src\features\K\Components\small\KProgressRetentionChart.tsx` |
| Mastery-over-time chart | `C:\Users\Admin\source\SuperApp\src\features\K\Components\small\KProgressMasteryChart.tsx` |
| Question state timeline chart | `C:\Users\Admin\source\SuperApp\src\features\K\Components\small\KProgressQuestionCountChart.tsx` |
| Question service (BE) | `C:\Users\Admin\source\Timeline\SuperAppServices\Services\K\KQuestionService.cs` |
| Question repository (BE) | `C:\Users\Admin\source\Timeline\SuperAppDataRepositories\Repositories\K\KQuestionRepository.cs` |
| Status history repository (BE) | `C:\Users\Admin\source\Timeline\SuperAppDataRepositories\Repositories\K\KStatusHistoryRepository.cs` |
| Status history entities (BE) | `C:\Users\Admin\source\Timeline\SuperAppModels\Models\K\KQuestionStatusHistoryEntity.cs`, `KNodeStatusHistoryEntity.cs` |
| Question entity (BE) | `C:\Users\Admin\source\Timeline\SuperAppModels\Models\K\KQuestionEntity.cs` |
| Response DTOs (BE) | `C:\Users\Admin\source\Timeline\SuperAppModels\DTOs\Responses\KTestResponse.cs` |

---

## Dashboard Layout (top → bottom)

```
┌─────────────────────────────────────────────────────────┐
│  Active Qs │ Avg Retention │ Due Today │ Draft Qs        │  ← 4 stat cards
├─────────────────────────────────────────────────────────┤
│  Review streak (compact single-row bar)                  │
├──────────────────────┬──────────────────────────────────┤
│  Avg retention       │  Memory strength over time       │  ← 2-col charts
│  (line chart)        │  (3-line: strong/learning/       │
│                      │   not started nodes per day)     │
├─────────────────────────────────────────────────────────┤
│  Question states over time (4-line: master/learning/    │  ← full-width
│  draft/deleted, all-time, ≤60 sampled points)            │
├─────────────────────────────────────────────────────────┤
│  Retention per node (donut + per-node list)              │
└─────────────────────────────────────────────────────────┘
```

---

## Data Sources — `Promise.allSettled` fetches 6 endpoints

```ts
KQuizService._getQuestions(knowledgeId)               // all questions of knowledge incl. orphans
KQuizService._getRetention(knowledgeId)               // KRetentionSummary { average, totalQuestions }
KQuizService._getRetentionGraph(knowledgeId, 14)      // 14-day per-question retention history
KQuizService._getDailyQueue(knowledgeId)              // due/new counts
KService._getWorkspaceTreeV2("", knowledgeId)         // flat list of active nodes
KQuizService._getQuestionStatusTimeline(knowledgeId)  // pre-aggregated 4-bucket timeline
```

**Filtering on load:**
- `questions = rawQs.filter(q => !q.deletedAt)`
- `nodes = flatData.filter(n => !n.deletedAt && n.statusCode !== "draft")`

---

## Question Status Codes

`k.question.status_code` and `k.node.status_code` use **only 2 values**:

| Code | Meaning |
|------|---------|
| `"learning"` | Active — included in daily review queue |
| `"draft"` | Excluded from review sessions |

`"mastered"` is **NOT** stored — master state is fully **derived** from `k.point_history` at read time. See *Question State Timeline* below.

`k.knowledge.status_code` is `"active" | "inactive"` (rarely toggled to inactive).

---

## Question State Timeline — 4 buckets

Card label: **"Question states over time"**. Renders 4 lines (master / learning / draft / deleted) over the entire history of a knowledge, sampled to ≤60 points.

### BE endpoint
`GET /api/k/{knowledgeId}/question-status-timeline` → `KQuestionService.GetQuestionStatusTimelineAsync` → `KQuestionStatusTimelineResponse { Days: [{ date, master, learning, draft, deleted }] }`

### Classification rule (per question, per day D)

Each question falls into **exactly one** bucket. Checked in this order — **first match wins**:

#### 1. **Deleted**
At least one of these is true at date D:
- `q.DeletedAt ≤ D`
- The node `q` belongs to has `node.DeletedAt ≤ D`
- The knowledge has `knowledge.DeletedAt ≤ D`
- The knowledge has `knowledge.StatusCode = "inactive"` (treated as deleted **from today** because no timestamp is tracked for status_code toggle on knowledge — rare in practice)

For **orphan questions** (`q.NodeId = null`): only `q.DeletedAt` counts. Orphans are not affected by knowledge cascade.

#### 2. **Draft**
Question is not deleted at D, AND:
- For nodal questions: `q.statusCode_at_D = "draft"` **OR** `node.statusCode_at_D = "draft"` (status looked up via `k.question_status_history` / `k.node_status_history`, taking the latest row with `changed_at ≤ D`; falls back to current entity status if no history row yet)
- For **orphan questions** (not deleted): always classified as **draft**, regardless of `q.statusCode`. Reasoning: an orphan is not part of any tree → not in any active learning flow → behave like draft.

#### 3. **Master**
Question is not deleted, not draft, and **all of its 10 most recent answers in `k.point_history` (with `created_at ≤ D`) have `point ≥ 5`**.
- Needs at least 10 answers; fewer → not master.
- Master is fully derived per-day, so a question can promote → regress → promote again as scores change.
- Orphans are never master (already classified as draft above).

#### 4. **Learning**
Question is not deleted, not draft, not master → **learning** (the default for an in-flight question).

### Why "status_code at D" works

Two history tables track every change:
- `k.question_status_history (id, question_id, status_code, changed_at, user_id)`
- `k.node_status_history (id, node_id, status_code, changed_at, user_id)`

A row is inserted on:
- Initial creation (status set when entity was created)
- Every time `status_code` changes (toggle draft, mark draft, bulk update, node update)

To know "what was Q's status on day D", scan its history rows in chronological order and take the latest with `changed_at ≤ D`.

### Hook points (BE writers)

| File:Method | When |
|-------------|------|
| `KQuestionRepository.AddQuestionsAsync` | New question → row with status `"learning"` |
| `KQuestionRepository.MarkQuestionDraftAsync` | Single mark draft (only if status actually changes) |
| `KQuestionRepository.ToggleQuestionsDraftAsync` | Bulk toggle |
| `KQuestionRepository.UpdateQuestionsStatusAsync` | Bulk set status |
| `KMarkdownImportService.CreateQuestionsForNodeAsync` | Markdown import |
| `KNodeHelperService.ProcessCreateAsync` | New node |
| `KNodeHelperService.ProcessUpdate` | Node update (only if status changed) |
| `KMarkdownImportService` (node creation) | Markdown import |

### Sampling

If history span > 60 days, BE samples to ≤60 points (step = ⌈total / 60⌉) but always includes today as the last point.

### Migration

`migrations/20260508_create_status_history_tables.sql` — creates 2 tables, indexes, and backfills 1 row per existing question / node at `created_at` with current `status_code` (idempotent — safe to re-run).

---

## Master state — derivation (replaces old stored status)

`q.statusCode` is **never** `"mastered"` — that bucket is computed, not stored.

```
isMasterAt(question, D) =
    pointHistory(question, where created_at ≤ D)
        .takeLast(10)
        .all(p => p.point >= 5)
    && pointHistory.count(... ≤ D) >= 10
```

This affects:
- **Dashboard timeline chart**: master line per day
- **Per-node "Retention per node" section**: a node is "Mastered" when all its non-draft questions are master at *today*

Because master is derived, no transition trigger is needed — it auto-flips as score history grows.

Daily review queue still includes master-state questions naturally because `SrsNextReviewAt` becomes due (intervals lengthen as scores stay perfect, but eventually the question is shown again, creating a chance to regress).

---

## Retention Levels (for "Retention per node" section)

| Level | Threshold | Color |
|-------|-----------|-------|
| High | avgRet ≥ 80% | `#30d158` (green) |
| Medium | avgRet ≥ 50% | `#ff9f0a` (amber) |
| Low | avgRet < 50% | `#8e8e93` (gray) |

Per-node row shows:
- "Mastered" green pill if every non-draft question of the node is currently master (derived)
- Otherwise High/Medium/Low pill based on avg retention

Donut center shows: `masteredNodes / totalNodes`.

---

## Stat Cards

| # | Label | Value | Pill |
|---|-------|-------|------|
| 1 | Active Questions | `learningQs.length` (`statusCode === "learning"` && active node) | "across N nodes" |
| 2 | Avg Retention | `retention.average` from BE | "X high · Y mid · Z low" |
| 3 | Due Today | `dueToday` from dailyQueue | "X new cards" |
| 4 | Draft Questions | count `statusCode === "draft"` && active node | "excluded from review" |

Text is left-aligned inside each card.

---

## SVG Charts — shared style

All charts use **smooth catmull-rom → cubic bezier curves** (tension = 0.4). No dot markers by default — dots appear only on hover (r = 4px).

**`KProgressRetentionChart`**:
- Single green line, Y range 50–100%, area fill `fillOpacity: 0.06`
- Always shows last-point dot when not hovering

**`KProgressMasteryChart`** *(node-level memory strength, NOT the 4-bucket chart)*:
- 3 lines: Mastered (#30d158), Learning (#ff9f0a), Inactive (#8e8e93)
- Per-day node counts computed from `retentionGraph.days[].retentions`
- Node classified per day: mastered (avg ≥ 80), learning (avg > 0 and < 80), inactive (avg = 0)

**`KProgressQuestionCountChart`** *(the 4-bucket chart)*:
- 4 lines: Master (#30d158), Learning (#0071e3), Draft (#8e8e93), Deleted (#ff453a)
- Reads pre-aggregated `KQuestionStatusTimeline` from BE — no client-side classification
- Y axis auto-scales to max value across all 4 series
- X-axis label interval adapts to range (≤7 days: every day; ≤30: every 5; ≤60: every 10; longer: ~6 labels total)

Shared helper:
```ts
function smoothLinePath(pts: Array<{x: number; y: number}>, tension = 0.4): string {
    if (pts.length === 0) return "";
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
}
```

Per CLAUDE.md "no re-export across helpers", copy this function into each chart file rather than importing.

---

## Review Streak

Compact single-row card:
- Label on left: "Review streak" + "🔥 N-day"
- 14-day grid on right (tiles sized by flex-1)
- Levels from `retentionGraph.days[].average`: ≥80 → level 3, ≥65 → level 2, >0 → level 1, 0/null → level 0
- Today tile outlined with `#0071e3`

---

## Style Constants

```ts
const CARD = "bg-card rounded-[18px] shadow-[0_2px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden";
const CARD_LBL = "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]";
const C = { high: "#30d158", mid: "#ff9f0a", low: "#8e8e93", blue: "#0071e3", red: "#ff453a", orange: "#ff6b35" };
```

---

## Backend — Key Methods

**`KQuestionService`**:
- `GetKnowledgeQuestionsAsync` — all questions for the knowledge (used by stat cards / per-node retention)
- `GetRetentionSummaryAsync`, `GetRetentionGraphAsync` — retention chart + memory strength
- `GetQuestionStatusTimelineAsync(knowledgeId, userId)` — 4-bucket timeline (uses `IKStatusHistoryRepository` for status replay + `IKQuestionRepository.GetHistoryForQuestionsAsync` for master derivation)

**`KQuestionRepository`**:
- `GetAllQuestionsByKnowledgeAsync` — `Include(q => q.Node).Where(q => q.Node == null || q.Node.KnowledgeId == knowledgeId)` — note: includes orphans of the whole system (orphan = `Node == null`)
- `GetActiveQuestionsAsync` — for avg retention; filters out orphans / deleted nodes / deleted questions / draft
- `GetDailySessionQuestionsAsync` — due pool: `StatusCode == "learning"` only (master is no longer a stored status)
- `UpdateQuestionsStatusAsync(ids, statusCode)` — bulk update + writes status history rows
- `ToggleQuestionsDraftAsync` / `MarkQuestionDraftAsync` — write status history rows

**`KStatusHistoryRepository`**:
- `AddQuestionStatusAsync` / `AddQuestionStatusBulkAsync` — append history rows after status mutation
- `AddNodeStatusAsync`
- `GetQuestionStatusHistoryByKnowledgeAsync(knowledgeId)` — used by timeline endpoint
- `GetNodeStatusHistoryByKnowledgeAsync(knowledgeId)`

---

## Task

{ARGS}

Use the context above to implement or fix the requested change. Read files before editing. Follow SuperApp code conventions (max 400 lines/file, single responsibility, no re-exports across boundaries).
