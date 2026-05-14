---
name: sa-date-strategy
description: "Fake UTC" date handling strategy for SuperApp — ensures consistent date display across FE/BE/DB without timezone shift.
---

# SuperApp Date Handling Strategy: "Fake UTC"

## Problem
JavaScript `Date.toISOString()` converts local time to UTC, causing a -7h shift (Vietnam GMT+7).
Example: User picks `26/02 00:00` → `toISOString()` → `"2026-02-25T17:00:00Z"` → DB stores **25/02** ← WRONG.

## Solution: Treat local time AS IF it were UTC — no timezone conversion.

---

## Rules (MUST follow for ALL date fields)

### 1. FE → BE: Use `toLocalISOString()`
```ts
import { toLocalISOString } from "@/utils/date.utils";

// ✅ CORRECT
payload.startDate = toLocalISOString(date);  // "2026-02-26T00:00:00.000Z"

// ❌ WRONG — never use these for API payloads
date.toISOString();      // shifts -7h
date.toJSON();           // same as toISOString
JSON.stringify(date);    // same as toISOString
```

### 2. BE → FE: Use `parseAsLocalDate()`
```ts
import { parseAsLocalDate } from "@/utils/date.utils";

// ✅ CORRECT
const localDate = parseAsLocalDate(dto.createdAt);  // parses "T10:00:00Z" as local 10:00

// ❌ WRONG — never use these for API responses
new Date(isoString);           // interprets Z as UTC, shifts +7h display
Date.parse(isoString);         // same problem
```

### 3. Backend (.NET): Use `DateTime.Now`
```csharp
// ✅ CORRECT — for CreatedAt, UpdatedAt, or any "current time" field
entity.CreatedAt = DateTime.Now;
entity.UpdatedAt = DateTime.Now;

// ❌ WRONG — causes 7h offset in DB
DateTime.UtcNow;
```

### 4. DB: Use `datetime2` column type
```sql
[created_at] DATETIME2(3) DEFAULT (sysdatetime()) NOT NULL
-- sysdatetime() = local server time ✅
-- sysutcdatetime() = UTC ❌
```

---

## Utility Functions

**File:** `src/utils/date.utils.ts`

| Function | Direction | Purpose |
|---|---|---|
| `toLocalISOString(date)` | FE → BE | Serialize Date to ISO string preserving local time values |
| `parseAsLocalDate(str)` | BE → FE | Parse ISO string as local time (ignores Z suffix) |

---

## Common Patterns

### Transform DTO → Domain (loading data)
```ts
// In utils or helper files
const task: Task = {
    ...dto,
    startDate: parseAsLocalDate(dto.startDate),
    endDate: parseAsLocalDate(dto.endDate),
    createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
};
```

### Transform Domain → Request (saving data)
```ts
// In service or helper files
const request = {
    ...task,
    startDate: toLocalISOString(task.startDate),
    endDate: toLocalISOString(task.endDate),
};
```

### Display relative time (e.g. "5m ago")
```ts
// Both dates MUST be in same timezone (both local)
const diff = new Date().getTime() - parseAsLocalDate(dto.createdAt)!.getTime();
// ✅ Correct because both are local time

// ❌ WRONG: mixing local new Date() with UTC-parsed date
const diff = new Date().getTime() - new Date(dto.createdAt).getTime();
// This gives wrong diff by ±7h
```

---

## When This Approach Works
- ✅ Single-timezone app (all users in same timezone)
- ✅ "Display time" — user sees what they entered
- ❌ NOT for multi-timezone apps needing cross-timezone sync

## Task: {user_input}

Apply the Fake UTC date strategy rules above when reviewing or writing code that handles dates. Flag any violations of these rules.
