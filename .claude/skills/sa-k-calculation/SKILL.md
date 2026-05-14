---
name: sa-k-calculation
description: Logic tính toán trong K (Knowledge) module — badge counts, SRS due counts, daily review queue.
---

# K Module — Calculation Logic

Context về các công thức/logic tính toán trong K module. Dùng làm reference khi debug hoặc thêm tính năng liên quan đến số liệu SRS/review.

---

## 1. `dailyReviewDueCount` — ActivityBar badge

**Ý nghĩa:** Tổng số câu hỏi đang chờ review trên **toàn bộ** knowledge bases.

**Nguồn dữ liệu:** API `GET /api/k/global-daily-queue` → `KDailyQueueItem[]`

```ts
// src/features/K/hooks/kTree/useK.loader.ts — loadDailyReviewCount()
const dueCount = res.object.reduce((sum, q) => sum + q.dueCount, 0);
setDailyReviewDueCount(dueCount);
```

**Lưu ý:**
- Chỉ cộng `dueCount`, **không** cộng `newCount` (new = chưa học lần nào, khác với due = đến hạn ôn)
- API chỉ trả về các **knowledge active** và **node active** — knowledge/node bị archive/inactive không được tính
- Lưu vào store tại `useK.store.tsx`, expose qua `useKStore().dailyReviewDueCount`
- `k.module.tsx` dùng giá trị này làm badge: `useBadge: () => useKStore().dailyReviewDueCount`

**Type:**
```ts
// src/features/K/types/kTest.type.ts
interface KDailyQueueItem {
    knowledgeId: number;
    knowledgeName: string;
    dueCount: number;   // câu hỏi đến hạn ôn (srsNextReviewAt <= now)
    newCount: number;   // câu hỏi mới chưa học
    activeCount: number;
}
```

---

## 2. `dueSrsCount` — blue dot trên KNode

**Ý nghĩa:** Số câu hỏi có `srsNextReviewAt <= now` của **một node** cụ thể.

**Nguồn dữ liệu:** Tính sẵn ở backend, trả về trong `GET /api/k/{knowledgeId}/tree-v2` → field `dueSrsCount` trên mỗi `KItemV2`.

**Hiển thị:** Blue dot trong `KNode.tsx`
```tsx
// src/features/K/Components/KExplorer/KNode.tsx
{nodeItem.statusCode === "learning" && treeType === "workspaceTree" && (nodeItem.dueSrsCount ?? 0) > 0 && (
    <span title={`${nodeItem.dueSrsCount} question(s) due`}
          className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
)}
```

**Điều kiện hiển thị dot:**
1. `statusCode === "learning"`
2. `treeType === "workspaceTree"` (không hiện ở target tree)
3. `dueSrsCount > 0`

**Quan hệ với `dailyReviewDueCount`:**
`dailyReviewDueCount` = Σ `dueSrsCount` của tất cả learning nodes có dot hiện (về mặt semantic — dữ liệu lấy từ 2 API khác nhau nhưng cùng tiêu chí).

---

## Task

{{args}}
