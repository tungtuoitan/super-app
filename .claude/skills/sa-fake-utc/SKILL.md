---
name: sa-fake-utc
description: SuperApp date handling strategy — "Fake UTC". How dates flow between FE, API, and DB without timezone shift.
---

# SuperApp — Chiến lược "Fake UTC"

## Vấn đề

JavaScript `Date.toISOString()` luôn convert sang UTC thật:

```
Local: 2024-01-15 09:00 (GMT+7, Vietnam)
.toISOString() → "2024-01-15T02:00:00.000Z"  ← sai, bị lùi 7 tiếng
```

DB lưu string này, rồi khi FE đọc lại và parse bằng `new Date()`, nó lại interpret là UTC → hiển thị sai giờ.

## Giải pháp: Fake UTC

**Quy ước:** Mọi date trong hệ thống đều được xử lý như thể user ở UTC. Không có conversion timezone ở bất kỳ đâu.

- **FE → API**: gửi local time nhưng giả vờ nó là UTC (dùng `toLocalISOString`)
- **DB**: lưu đúng string đó (không convert)
- **API → FE**: trả về đúng string đó, FE parse như local time (dùng `parseAsLocalDate`)

Kết quả: `2024-01-15 09:00` ở VN → DB lưu `"2024-01-15T09:00:00.000Z"` → FE đọc lại hiển thị `09:00` ✓

---

## File cốt lõi

`src/shared/utils/date.utils.ts` — export 2 hàm duy nhất.

### `toLocalISOString(date: Date | null | undefined): string | null`

Dùng khi **gửi date lên API** (trong service call, upsert payload).

```ts
import { toLocalISOString } from "@/shared";

// Thay vì:
startDate: date.toISOString()           // ❌ shift timezone

// Dùng:
startDate: toLocalISOString(date)       // ✓ giữ nguyên giờ local
```

Nó lấy các component local (`getFullYear`, `getMonth`, `getDate`, `getHours`...) rồi ghép thành ISO string kết thúc bằng `Z` — nhưng giá trị là local time, không phải UTC.

### `parseAsLocalDate(isoString: string | null | undefined): Date | null`

Dùng khi **nhận date từ API** (trong DTO → domain transform).

```ts
import { parseAsLocalDate } from "@/shared";

// Thay vì:
startDate: new Date(dto.startDate)          // ❌ interpret as UTC → sai giờ

// Dùng:
startDate: parseAsLocalDate(dto.startDate)  // ✓ treat values as local time
```

Nó regex-parse string, lấy raw numbers rồi gọi `new Date(year, month-1, day, hours, ...)` — constructor này dùng local time.

---

## Pattern chuẩn trong FE

### 1. DTO → Domain (khi nhận từ API)

Toàn bộ date fields trong transform function đều dùng `parseAsLocalDate`:

```ts
// src/features/taskDetail/utils/TaskDetail.utils.ts
import { parseAsLocalDate } from "@/shared";

function dtoToDomain(dto: TaskDTO): Task {
    return {
        ...dto,
        startDate:   parseAsLocalDate(dto.startDate),
        endDate:     parseAsLocalDate(dto.endDate),
        createdAt:   parseAsLocalDate(dto.createdAt) || new Date(),
        updatedAt:   parseAsLocalDate(dto.updatedAt),
        deletedAt:   parseAsLocalDate(dto.deletedAt),
    };
}
```

### 2. Domain → API Request (khi gửi lên)

Mọi date field trong payload đều dùng `toLocalISOString`:

```ts
// src/features/project/task/hooks/taskTimeline/useTaskTimeline.helper.ts
import { toLocalISOString } from "@/shared";

await taskService.upsert({
    startDate: toLocalISOString(startDate),
    endDate:   toLocalISOString(endDate),
});
```

### 3. "Now" timestamp (deletedAt, occurAt, v.v.)

```ts
deletedAt: toLocalISOString(new Date())
occurAt:   toLocalISOString(new Date())
```

---

## Quy tắc bắt buộc

| Tình huống | Dùng |
|---|---|
| Date field trong API request payload | `toLocalISOString(date)` |
| Date field khi map DTO → domain object | `parseAsLocalDate(dto.field)` |
| Timestamp "hiện tại" gửi lên server | `toLocalISOString(new Date())` |
| So sánh/tính toán date trong FE | Dùng `Date` object bình thường sau khi đã parse |
| Hiển thị date cho user | Dùng `Date` object sau `parseAsLocalDate`, format tùy UI |

## Lỗi thường gặp

```ts
// ❌ Sai — dùng toISOString() chuẩn
payload.dueDate = date.toISOString();

// ❌ Sai — parse bằng new Date() trực tiếp
const d = new Date(dto.dueDate);

// ❌ Sai — quên parse, giữ nguyên string từ DTO
const task = { dueDate: dto.dueDate };

// ✓ Đúng
payload.dueDate = toLocalISOString(date);
const d = parseAsLocalDate(dto.dueDate);
```

---

## BE (tham khảo)

BE không làm gì đặc biệt — nhận string, lưu thẳng vào DB dạng `DATETIME` hoặc `TIMESTAMP` **không có timezone conversion**. Khi trả về cũng trả nguyên string đó. Convention là BE treat tất cả datetime column như "local time của user" chứ không convert sang UTC thật.

---

## Task

{{USER_TASK}}

Áp dụng chiến lược Fake UTC: dùng `toLocalISOString` khi gửi lên API, `parseAsLocalDate` khi nhận từ API.
