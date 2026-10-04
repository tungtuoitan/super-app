---
name: sa-date-handling
description: SuperApp date handling strategy (thay thế "Fake UTC" cũ — folder vẫn tên sa-fake-utc để không gãy link). Phân biệt INSTANT (ISO 8601 có offset) và CALENDAR DATE ("YYYY-MM-DD"); 4 helper parseInstant / toInstantISO / parseDateOnly / toDateOnly trong src/shared/utils/date.utils.ts. Dùng khi đọc/gửi bất kỳ field ngày giờ nào giữa FE và API.
---

# SuperApp — Date handling (instant vs calendar date)

> **Tên cũ:** `sa-fake-utc` ("Fake UTC" — gửi giờ local giả làm UTC bằng
> `toLocalISOString`, đọc bằng `parseAsLocalDate`). Convention đó **đã bỏ**;
> 2 helper cũ đã bị xoá khỏi code. Folder giữ tên `sa-fake-utc` chỉ để không
> gãy link/reference.

## Hai loại giá trị ngày giờ

| Loại | Ý nghĩa | Ví dụ field | Dạng trên API |
|---|---|---|---|
| **INSTANT** | 1 thời điểm thật trên trục thời gian | `createdAt`, `updatedAt`, `deletedAt`, `occurAt`, `occurredAt`, `srsNextReviewAt`, `lastPushAt`, `expiry`... | ISO 8601 **có offset**: `"2026-10-04T09:00:00.000+07:00"` (BE trả theo timezone của user). BE **từ chối** input không có offset. `"...Z"` là offset hợp lệ. |
| **CALENDAR DATE** | 1 ngày trên lịch, không giờ, không timezone | task `startDate`/`endDate`, `projectStartDate`/`projectEndDate`/`parentStartDate`/`parentEndDate` (trên task), project `startDate`/`endDate`, daily log `logDate`, user `dateOfBirth` | `"YYYY-MM-DD"` (cả chiều đọc lẫn ghi) |

Quy tắc chọn: field là "ngày trên lịch" (người dùng chọn 1 ngày, không quan tâm giờ) → CALENDAR DATE. Mọi thứ còn lại (timestamp hệ thống, sự kiện xảy ra lúc nào) → INSTANT.

---

## File cốt lõi: `src/shared/utils/date.utils.ts`

Export qua `@/shared`:

```ts
import { parseInstant, toInstantISO, parseDateOnly, toDateOnly } from "@/shared";
```

| Hàm | Chiều | Làm gì |
|---|---|---|
| `parseInstant(s?: string \| null): Date \| null` | API → FE | `new Date(s)`; rỗng/invalid → `null` |
| `toInstantISO(d?: Date \| null): string \| null` | FE → API | `d.toISOString()` (UTC `Z`); rỗng/invalid → `null` |
| `parseDateOnly(s?: string \| null): Date \| null` | API → FE | lấy 10 ký tự đầu `"YYYY-MM-DD"` → `new Date(y, m-1, d)` = **0h LOCAL** |
| `toDateOnly(d?: Date \| null): string \| null` | FE → API | `"YYYY-MM-DD"` từ `getFullYear/getMonth/getDate` **LOCAL** |

Calendar date sau `parseDateOnly` là `Date` ở 0h local — đúng thứ timeline/grid/kanban đang tính toán (so sánh ngày, cộng ngày, `differenceInDays`...). Không cần đổi logic timeline.

---

## Pattern chuẩn

### 1. DTO → Domain (nhận từ API)

```ts
// src/features/taskDetail/utils/TaskDetail.utils.ts
function dtoToDomain(dto: TaskDTO): Task {
    return {
        ...dto,
        startDate:        parseDateOnly(dto.startDate),
        endDate:          parseDateOnly(dto.endDate),
        projectStartDate: parseDateOnly(dto.projectStartDate),
        createdAt:        parseInstant(dto.createdAt) || new Date(),
        updatedAt:        parseInstant(dto.updatedAt),
        deletedAt:        parseInstant(dto.deletedAt),
    };
}
```

Với INSTANT, `new Date(dto.createdAt)` cũng đúng (string có offset) — `parseInstant` chỉ thêm null-safe + invalid → `null`.

### 2. Domain → API request (gửi lên)

```ts
await taskService.upsert({
    startDate: toDateOnly(task.startDate),   // "2026-10-04"
    endDate:   toDateOnly(task.endDate),
    deletedAt: toInstantISO(task.deletedAt), // "2026-10-04T02:00:00.000Z"
});
```

### 3. Timestamp "bây giờ"

```ts
deletedAt: toInstantISO(new Date())   // hoặc new Date().toISOString() — tương đương
occurAt:   toInstantISO(new Date())
```

### 4. Key theo ngày (group/map theo ngày local)

```ts
const key = toDateOnly(d);   // ✓ ngày local
const key = d.toISOString().slice(0, 10);   // ❌ ngày UTC — ở VN trước 7h sáng ra ngày hôm trước
```

### 5. Tính khoảng thời gian ("5 phút trước")

```ts
const diff = Date.now() - parseInstant(dto.createdAt)!.getTime();   // ✓ instant thật, so được trực tiếp
```

---

## KHÔNG được làm

```ts
// ❌ new Date("YYYY-MM-DD") — JS parse date-only string là UTC 0h
//    → ở timezone âm (Mỹ) thành ngày hôm trước; ở VN thành 7h sáng thay vì 0h.
new Date(dto.startDate);
new Date("2026-10-04");

// ❌ toISOString() cho calendar date — convert sang UTC
//    → ở VN, 0h ngày 04 thành "2026-10-03T17:00:00.000Z" (lệch sang ngày 03).
payload.startDate = task.startDate.toISOString();

// ❌ toISOString().slice(0, 10) để lấy "ngày" — là ngày UTC, không phải ngày local.

// ❌ Gửi INSTANT không có offset — BE sẽ từ chối.
payload.deletedAt = "2026-10-04T09:00:00";

// ❌ Gửi thẳng Date object trong payload — JSON.stringify gọi toISOString()
//    → calendar date bị lệch ngày. Luôn convert bằng toDateOnly / toInstantISO.

// ✓ Đúng
payload.startDate = toDateOnly(task.startDate);
payload.deletedAt = toInstantISO(new Date());
const start = parseDateOnly(dto.startDate);
const created = parseInstant(dto.createdAt);
```

---

## Bảng tra nhanh

| Tình huống | Dùng |
|---|---|
| Đọc calendar date từ DTO | `parseDateOnly(dto.field)` |
| Gửi calendar date lên API / query param | `toDateOnly(date)` |
| Đọc instant từ DTO | `parseInstant(dto.field)` (hoặc `new Date(str)`) |
| Gửi instant lên API | `toInstantISO(date)` (hoặc `date.toISOString()`) |
| So sánh/tính toán trong FE | `Date` object bình thường sau khi parse |
| Hiển thị | format `Date` theo UI (date-fns `format`...) — luôn ra giờ/ngày local |

## Lưu ý

- Calendar date **không có giờ**: nếu UI cho chọn giờ cho task start/end (DateRangePicker có ô giờ), phần giờ sẽ bị bỏ khi gửi `toDateOnly`.
- Instant hiển thị theo timezone của **trình duyệt** (`Date` local). BE trả offset theo timezone user (setting profile) — 2 cái trùng nhau khi user ở đúng timezone đã cài.

---

## Task

{{USER_TASK}}

Áp dụng convention trên: calendar date → `parseDateOnly` / `toDateOnly`; instant → `parseInstant` / `toInstantISO`. Không dùng `new Date("YYYY-MM-DD")` và không `toISOString()` cho calendar date.
