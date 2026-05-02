# Best Practices — Functions & Components

Tài liệu này ghi lại các quy ước được dùng trong codebase này.  
Mục tiêu: code dễ đọc, dễ sửa, ít bug tiềm ẩn.

---

## Mục lục

1. [Đặt tên](#1-đặt-tên)
2. [Hàm thuần (pure functions / utils)](#2-hàm-thuần-pure-functions--utils)
3. [Custom hooks](#3-custom-hooks)
4. [React components](#4-react-components)
5. [TypeScript](#5-typescript)
6. [Tổ chức file](#6-tổ-chức-file)
7. [Anti-patterns cần tránh](#7-anti-patterns-cần-tránh)

---

## 1. Đặt tên

### Nguyên tắc chung

Tên phải trả lời được câu hỏi **"nó làm gì?"** mà không cần đọc body.

```ts
// ❌ Quá mơ hồ
const process = (data: any) => { ... }
const handle = () => { ... }
const update = (id: number) => { ... }

// ✅ Rõ ý định
const normalizePhoneNumber = (raw: string): string => { ... }
const handleTabRightClick = (e: MouseEvent, tabId: string) => { ... }
const updateTabTitle = (tabId: string, newTitle: string) => { ... }
```

### Quy ước theo loại

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Hàm trả về boolean | `is`, `has`, `can`, `should` | `isGroupChild`, `hasUnsavedChanges`, `canDelete` |
| Hàm lấy dữ liệu | `get`, `find`, `select` | `getActiveTab`, `findKeywordForNote` |
| Hàm biến đổi dữ liệu | động từ rõ | `parseTabFromStorage`, `inferTabTitle`, `sortByPinnedFirst` |
| Hàm có side effect | động từ rõ | `saveToStorage`, `dispatchTabOpened`, `loadKeywords` |
| Event handler | `handle` + sự kiện | `handleDragStart`, `handleCloseTab` |
| Hook | `use` + noun | `useTabBarHelper`, `useEditorTabBarStore` |
| Component | PascalCase + noun | `TabBar`, `EditorToolbar`, `WelcomeState` |

### Tránh prefix `_` cho public

`_` có nghĩa là "private / internal — không dùng từ ngoài".  
Nếu bạn export nó ra → đặt tên mô tả thay vì dùng `_`.

```ts
// ❌ Mâu thuẫn: private prefix nhưng lại export
return { _setActiveTabId }

// ✅ Tên nói lên intent, export thoải mái
return { setActiveTabIdSilently }
```

---

## 2. Hàm thuần (pure functions / utils)

### Một hàm làm đúng một việc

```ts
// ❌ Làm quá nhiều thứ
function processTab(tab: BaseTab, user: User, persist: boolean) {
    const title = tab.data?.name ?? tab.data?.title ?? "";
    const breadcrumb = buildBreadcrumb(tab);
    if (persist) localStorage.setItem("tab", JSON.stringify(tab));
    sendAnalytics("tab_open", { tabId: tab.id, userId: user.id });
    return { ...tab, title, breadcrumb };
}

// ✅ Tách thành các hàm nhỏ
function inferTabTitle(data: unknown, meta: TabOpenMeta): string {
    if (meta.title !== undefined) return meta.title;
    const d = data as Record<string, unknown> | null;
    if (typeof d?.name === "string") return d.name;
    if (typeof d?.title === "string") return d.title;
    return "";
}
```

### Extract helper khi logic lặp lại ≥ 2 lần

```ts
// ❌ Logic lặp ở 3 nơi
// useTabBarHelper.ts:   tabs.sort((a,b) => a.isPinned && !b.isPinned ? -1 : ...)
// useTabBarMenu.ts:     newTabs.sort((a,b) => a.isPinned && !b.isPinned ? -1 : ...)
// useTabBarShortcuts.ts newTabs.sort((a,b) => a.isPinned && !b.isPinned ? -1 : ...)

// ✅ Một nơi duy nhất
// tabBar.utils.ts
export function sortByPinnedFirst(tabs: BaseTab[]): BaseTab[] {
    return [...tabs].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });
}
```

### Đặt constants cho magic numbers / strings

```ts
// ❌ Magic numbers — không biết 2 và 3 nghĩa là gì
if (item.entityType === 2) { ... }
if (item.entityType === 3) { ... }

// ✅ Có tên, có chỗ để thay đổi sau này
const ENTITY_TYPE_FOLDER = 2;
const ENTITY_TYPE_NOTE   = 3;

if (item.entityType === ENTITY_TYPE_FOLDER) { ... }
if (item.entityType === ENTITY_TYPE_NOTE)   { ... }
```

### Tham số: không quá 3, dùng object khi ≥ 3

```ts
// ❌ Khó nhớ thứ tự
buildBreadcrumb(noteWorkspaceItemId, noteId, noteName, flatData, workspaceId, workspaceName)

// ✅ Dùng object — tự documenting, thứ tự không quan trọng
buildBreadcrumb({
    noteWorkspaceItemId,
    noteId,
    noteName,
    flatData,
    workspaceId,
    workspaceName,
})
```

### Return sớm thay vì lồng if

```ts
// ❌ Pyramid of doom
function processTab(tab: BaseTab | null) {
    if (tab) {
        if (tab.data) {
            if (tab.hasUnsavedChanges) {
                // ... logic chính ở đây
            }
        }
    }
}

// ✅ Guard clauses — logic chính không bị thụt lề
function processTab(tab: BaseTab | null) {
    if (!tab) return;
    if (!tab.data) return;
    if (!tab.hasUnsavedChanges) return;

    // logic chính ở đây — luôn ở mức 1 indent
}
```

---

## 3. Custom hooks

### Quy tắc cơ bản

- Hook chỉ chứa **logic** — không return JSX.
- Hook **không re-export** từ hook khác.
- Destructure khi consume, không dùng alias:

```ts
// ✅
const { openTab, closeTab, getActiveTab } = useEditorTabBarHelper();

// ❌ Alias gây confusion
const { openTab: openNewTab } = useEditorTabBarHelper();
```

### Tách helper vs headless vs store

| File | Chứa gì |
|------|---------|
| `useXxx.helper.ts` | Hàm business logic — gọi services, cập nhật store. **Được phép có `useEffect` nếu effect là internal detail của chính hook đó** (cleanup timer, sync ref…) |
| `useXxx.headless.ts` | `useEffect` **orchestration** — kết hợp nhiều helper/selector để load data, sync state khi dependency ngoài thay đổi |
| `useXxx.store.ts` | Zustand store — state + setters |
| `useXxx.selector.ts` | Derived state từ store — không có setter |

**Quy tắc phân biệt — đặt `useEffect` ở đâu?**

| Loại effect | Đặt ở đâu | Lý do |
|---|---|---|
| Cleanup timer/subscription nội bộ của 1 hook | Trong helper | Internal detail — hook tự quản lý lifecycle của mình |
| Load data khi state ngoài thay đổi | Headless | Kết hợp nhiều hook, orchestration |
| Sync state giữa các module | Headless | Cross-concern, không thuộc về 1 hook cụ thể |

```ts
// ✅ useEffect cleanup nội bộ — để trong helper là đúng
export const useChecklistHelper = () => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current); // cleanup timer của chính hook này
    }, []);

    const scheduleSave = () => { ... };
    return { scheduleSave };
};

// ✅ useEffect orchestration — để trong headless
export const useNoteHeadless = () => {
    const { selectedNote } = useNoteSelector();
    const { loadComments } = useCommentHelper();
    const { loadKeywords } = useKeywordHelper();

    useEffect(() => {
        loadComments(selectedNote.id);  // kết hợp nhiều helper
        loadKeywords(selectedNote.id);
    }, [selectedNote.id]);
    // không return gì
};

// ❌ Service call trong UI file — luôn sai, bất kể loại effect
export function NoteContent() {
    useEffect(() => {
        noteService._getNotes(); // sai — UI không gọi service trực tiếp
    }, []);
}
```

### Dependency arrays phải chính xác

```ts
// ❌ Stale closure — setActiveTabId không trong deps
useEffect(() => {
    setActiveTabId(restoredId);
}, [$user.userId]);

// ✅ Option 1: thêm vào deps nếu nó có thể thay đổi
useEffect(() => {
    setActiveTabId(restoredId);
}, [$user.userId, setActiveTabId]);

// ✅ Option 2: dùng stable reference (Zustand setters là stable)
// Gọi setActiveTabId từ store trực tiếp thay vì qua wrapper function
const { setActiveTabId } = useEditorTabBarStore(); // stable ✓
useEffect(() => {
    setActiveTabId(restoredId);
    // eslint-disable-line react-hooks/exhaustive-deps -- Zustand setter is stable
}, [$user.userId]);
```

### Gọi hook trong loop (registry pattern)

Khi số lượng modules cố định và không thay đổi sau startup, có thể gọi hook trong `.map()` với comment giải thích rõ:

```ts
// eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
const handlers = moduleRegistry.getAll()
    .filter((m) => m.useSaveActions != null)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    .map((m) => m.useSaveActions!());
```

Nếu registry có thể thay đổi → **không làm vậy**.

---

## 4. React components

### Mỗi file chỉ có 1 component lớn

```
// ✅ Cấu trúc tốt
TabBar.tsx          → export function TabBar()        (component chính)
                    → function TabIcon()               (sub-component nhỏ, cùng file)

// ❌ Nhét nhiều component lớn vào 1 file
EditorArea.tsx → EditorArea + Toolbar + TabBar + WelcomeScreen
```

### Tách sub-component ra khi nó có state hoặc hook riêng

```tsx
// ❌ Gọi hook trong vòng lặp bên trong component lớn
function ActivityBar() {
    return modules.map(m => {
        const badge = m.useBadge?.(); // ← hook trong loop!
        return <button>{badge}</button>;
    });
}

// ✅ Tách thành component riêng — mỗi component có hooks của mình
function ModuleButton({ module }: { module: ModuleDefinition }) {
    const badge = module.useBadge?.() ?? 0; // ← hook ở top level ✓
    return <button>...</button>;
}

function ActivityBar() {
    return modules.map(m => <ModuleButton key={m.id} module={m} />);
}
```

### Props: destructure ở signature, không trong body

```tsx
// ✅
function TabBar({ tab, isActive, onClose }: TabBarProps) {
    ...
}

// ❌
function TabBar(props: TabBarProps) {
    const tab = props.tab;
    const isActive = props.isActive;
    ...
}
```

### Giữ JSX sạch — tách logic ra khỏi render

```tsx
// ❌ Logic phức tạp lẫn vào JSX
return (
    <div className={`... ${tab.hasUnsavedChanges
        ? modules.find(m => m.id === tab.type)?.color ?? "blue"
        : "gray"} ...`}>
```

```tsx
// ✅ Tính trước, đặt tên rõ
const tabColor = tab.hasUnsavedChanges
    ? modules.find(m => m.id === tab.type)?.color ?? "blue"
    : "gray";

return <div className={`... ${tabColor} ...`}>;
```

### Tránh `as any` trong JSX — dùng type guard

```tsx
// ❌
{(activeTab?.data as any)?.deletedAt && ...}

// ✅ Type guard một lần, dùng nhiều lần
const { isDeleted, isPermanentlyDeleted } = activeTab
    ? getTabDeleteState(activeTab)
    : { isDeleted: false, isPermanentlyDeleted: false };

{isDeleted && !isPermanentlyDeleted && ...}
```

### Conditional rendering: tránh `&&` với số 0

```tsx
// ❌ Render "0" ra màn hình khi count = 0
{count && <Badge>{count}</Badge>}

// ✅
{count > 0 && <Badge>{count}</Badge>}

// ✅ Hoặc dùng ternary
{count > 0 ? <Badge>{count}</Badge> : null}
```

### Không dùng render function — dùng component thực sự

Hàm bên trong component trả về JSX là "render function" — cách viết tưởng tiện nhưng gây nhiều vấn đề:
- React không quản lý lifecycle → không có key, không có memo, không có error boundary
- Khó tái sử dụng, khó test độc lập
- Làm component cha phình to

```tsx
// ❌ Render function — hàm trong component trả về JSX
function TabBar() {
    const renderTab = (tab: BaseTab) => (
        <button key={tab.id}>...</button>
    );
    return <div>{openTabs.map(renderTab)}</div>;
}****

// ✅ Component thực sự — định nghĩa ngoài component cha
function TabButton({ tab }: { tab: BaseTab }) {
    return <button>...</button>;
}
function TabBar() {
    return (
        <div>
            {openTabs.map((tab) => <TabButton key={tab.id} tab={tab} />)}
        </div>
    );
}
```

Quy tắc: nếu bạn viết `const renderXxx = (...) => <...>` hoặc `function renderXxx(...)` **bên trong** một component → hãy chuyển thành module-level component.

---

## 5. TypeScript

### Không dùng `any` — dùng `unknown` + type guard

```ts
// ❌
const process = (data: any) => data.id;

// ✅ unknown + guard
const getId = (data: unknown): number | null => {
    if (typeof data === "object" && data !== null && "id" in data) {
        return typeof (data as { id: unknown }).id === "number"
            ? (data as { id: number }).id
            : null;
    }
    return null;
};
```

Khi cần cast nhiều chỗ → extract thành type guard:

```ts
function isEntityData(data: unknown): data is { id: number; deletedAt?: string } {
    return typeof data === "object" && data !== null && "id" in data;
}
```

### Tham số optional vs union với undefined

```ts
// ❌ Không rõ caller phải truyền gì
function openTab(data: unknown, meta?: TabOpenMeta, force?: boolean)

// ✅ Optional chỉ khi có default behavior hợp lý
function openTab(data: { id: number | string }, tabType: string, meta: TabOpenMeta = {})
```

### Return type rõ ràng cho public API

```ts
// ❌ TypeScript infer — ok cho internal, nhưng public API nên explicit
const getActiveTab = (tabId?: string) => {
    ...
}

// ✅ Rõ ràng
const getActiveTab = (tabId?: string): BaseTab | null => {
    ...
}
```

### Dùng `const` assertion cho constant objects

```ts
// ❌ TypeScript infer type quá rộng: { appName: string }
const shellConstants = {
    appName: "SuperApp",
}

// ✅ Type chính xác: { appName: "SuperApp" }
const shellConstants = {
    appName: "SuperApp" as const,
}
```

---

## 6. Tổ chức file

### Utils module-level vs inline

Nếu helper chỉ dùng trong 1 file → để trong file đó, phía trên hook/component:

```ts
// tabBar.helper.ts — hàm chỉ dùng nội bộ file này
function inferTabTitle(data: unknown, meta: TabOpenMeta): string { ... }

export const useTabBarHelper = () => { ... }
```

Nếu dùng ở ≥ 2 file → extract ra `xxx.utils.ts`:

```ts
// tabBar.utils.ts — shared
export function sortByPinnedFirst(tabs: BaseTab[]): BaseTab[] { ... }
export function savePinnedStateToStorage(tabs: BaseTab[]): void { ... }
export function isGroupChild(tab: BaseTab, allTabs: BaseTab[]): boolean { ... }
```

### Constants: local vs file riêng

Đặt constant **gần nhất với nơi dùng nó** — không tập trung tất cả vào 1 file chỉ vì chúng là constants.

| Scope sử dụng | Đặt ở đâu |
|---|---|
| 1 file duy nhất | Local, top of file (trên export) |
| ≥ 2 file trong cùng module | `moduleName.constants.ts` |
| Cross-module (feature khác cần) | `moduleName.constants.ts` + re-export qua `index.ts` |

```ts
// ✅ Chỉ 1 file dùng → local
// taskComment.utils.ts
const MAX_REPLY_DEPTH = 3; // chỉ file này cần

export function buildCommentTree(...) { ... }
```

```ts
// ✅ ≥ 2 file trong module dùng → constants file
// task.constants.ts
export const TASK_DEBOUNCE_MS = 300;      // dùng trong checklist + process helper
export const TASK_TITLE_MAX_LENGTH = 255; // dùng trong form + validation
```

```ts
// ✅ Cross-module → constants file + re-export qua index
// taskGrid.constants.ts
export const TIMELINE_ROW_HEIGHT = 36;
export const WEEKEND_STRIPE_BG = `repeating-linear-gradient(...)`;

// index.ts
export { TIMELINE_ROW_HEIGHT, WEEKEND_STRIPE_BG } from "./utils/taskGrid.constants";
```

```ts
// ❌ Constants file monolith — nhét mọi thứ vào 1 file
// task.constants.ts — 200 dòng từ khắp nơi
export const TIMELINE_ROW_HEIGHT = 36;  // chỉ timeline dùng
export const COMMENT_PAGE_SIZE = 20;    // chỉ comment dùng
export const DEBOUNCE_MS = 300;         // chỉ checklist dùng
```

```ts
// ❌ Constants lẫn trong utils file
// taskGrid.utils.ts — sai: constants không phải pure function
export const TIMELINE_ROW_HEIGHT = 36;
export function generateDateRange(...) { ... }
```

### Comment: khi nào viết, khi nào không

**Không cần comment** khi tên đã tự giải thích:
```ts
// ❌ Comment thừa
// Sort tabs by pinned status
const sorted = sortByPinnedFirst(tabs);
```

**Cần comment** khi giải thích **tại sao**, không phải **cái gì**:
```ts
// ✅ Giải thích lý do kỹ thuật
// data0 is the initial snapshot used by "Discard Changes" to reset data.
// Set once on creation, never mutated — treat as immutable.
data0: data,

// ✅ Giải thích contract không hiển nhiên
// Uses setActiveTabId from the store directly (stable Zustand setter — safe to
// call inside an effect without adding to the dependency array).
const { setActiveTabId } = useEditorTabBarStore();
```

**Không comment code đã bị xóa** — dùng git:
```ts
// ❌ Để lại code chết
// const getSideBarState = () => {
//     const { searchQuery, moduleName } = _getSideBarState();
//     return { searchQuery, moduleName };
// };
```

### Không re-export từ file khác (tránh barrel hell)

```ts
// ❌ helper re-export từ helper khác — vi phạm single responsibility
// useNote.helper.ts
export { loadKeywords } from "./useKeyword.helper"; // sai!

// ✅ Caller import trực tiếp từ nguồn
const { loadKeywords } = useKeywordHelper();
```

---

## 7. Anti-patterns cần tránh

### God hook

Hook có quá nhiều trách nhiệm → khó test, khó đọc, re-render không cần thiết.

```ts
// ❌ useEverything — làm quá nhiều thứ
export const useWorkspaceHelper = () => {
    // ... 50 hàm khác nhau
    return { loadWorkspace, saveNote, deleteFolder, moveItem, pinTab, ... };
};

// ✅ Tách theo domain
export const useWorkspaceLoader = () => { ... };  // chỉ load
export const useWorkspaceTreeHelper = () => { ... }; // chỉ tree operations
export const useWorkspaceItemHelper = () => { ... }; // chỉ items
```

### Prop drilling quá sâu

Nếu prop phải đi qua ≥ 3 lớp component → cân nhắc Zustand store hoặc Context.

```tsx
// ❌ Prop drilling
<Layout onTabClose={onTabClose}>
    <TabBar onTabClose={onTabClose}>
        <Tab onTabClose={onTabClose} />
    </TabBar>
</Layout>

// ✅ Tab tự gọi store/helper
function Tab({ tabId }: { tabId: string }) {
    const { closeTab } = useEditorTabBarHelper();
    return <button onClick={() => closeTab(tabId)}>...</button>;
}
```

### useEffect với deps array thiếu

```ts
// ❌ Stale closure — function thay đổi nhưng effect không chạy lại
useEffect(() => {
    doSomething(currentValue); // currentValue sẽ luôn là giá trị lúc mount
}, []); // ← thiếu deps

// ✅ Đủ deps — hoặc dùng ref nếu muốn tránh re-run
const currentValueRef = useRef(currentValue);
currentValueRef.current = currentValue;

useEffect(() => {
    doSomething(currentValueRef.current); // always fresh
}, []); // ← ok, dùng ref
```

### Nested ternary trong JSX

```tsx
// ❌ Khó đọc — phải trace từng điều kiện
{a ? b ? <X /> : <Y /> : c ? <Z /> : <W />}

// ✅ Dùng biến hoặc if-else trước return
const content = (() => {
    if (a && b) return <X />;
    if (a) return <Y />;
    if (c) return <Z />;
    return <W />;
})();

return <div>{content}</div>;
```

### setState trong render

```ts
// ❌ setState trong render → infinite loop hoặc extra render
function Component() {
    const [count, setCount] = useState(0);
    setCount(count + 1); // ← gọi trực tiếp trong render!
    return <div>{count}</div>;
}

// ✅ setState chỉ trong event handler hoặc useEffect
function Component() {
    const [count, setCount] = useState(0);
    useEffect(() => { setCount(1); }, []); // ← ok
    return <div onClick={() => setCount(c => c + 1)}>{count}</div>;
}
```

---

## Tóm tắt nhanh

```
Tên hàm        → tên = tài liệu. Đọc tên hiểu ngay việc nó làm.
Hàm nhỏ       → 1 hàm 1 việc. Dài hơn 40 dòng → cân nhắc tách.
Lặp lại       → lần thứ 2 thấy logic giống nhau → extract utils.
TypeScript     → unknown > any. Guard > cast. Return type explicit ở public API.
Hook deps      → dep array phải đầy đủ. Stable ref nếu muốn tránh re-run.
Comment        → giải thích "tại sao", không "cái gì".
Render func    → không dùng renderXxx() trong component → dùng component thực sự.
```


# các rule tạm, cần nghiên cứu thêm
- rule về constants: đặt ở main file constants, hoặc ở local
- rule về component: nếu markup lặp đi lặp lại, như khi dùng map() thì ta nên viết thành component mới, mục đích tránh nest markup