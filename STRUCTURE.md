# Structure

Cấu trúc code frontend (React 18 + TypeScript, CRA/CRACO, Zustand). Chỉ nói **cái gì nằm ở đâu** và **ai được import ai**.
Rule viết code chung: skill `code-rules`. Rule chi tiết từng loại file: `CLAUDE.md`.

## 1. Ba tầng, phụ thuộc một chiều (ESLint chặn)

```
features ──► shell ──► shared
features ─────────────► shared
```

| Tầng | Chứa | Được import | Không được |
|---|---|---|---|
| `shared/` | Thứ dùng chung, không biết app: auth, fetch, components, icons, file, flow, keyword... | không ai | import `features` hoặc `shell` |
| `shell/` | Khung kiểu VSCode: activity bar, sidebar, tab, panel, command palette, module registry, generic filter | `shared`, cổng của `features` | import file con của feature |
| `features/<tên>/` | Một tính năng trọn gói | `shared`, `shell`, cổng của feature khác | import file con của feature khác |

Ngoài ba tầng: `config/` (env, cấu hình app), `contexts/` (Navigation, Theme), `lib/` (theme, utils nhỏ), `App.tsx` (đăng ký module), `Main.tsx` (provider + layout shell).

## 2. Cổng (barrel `index.ts`)

- Qua ranh giới tầng/feature **chỉ import qua `index.ts`**: `@/features/project`, `@/shell`, `@/shared`.
- Trong cùng một feature dùng đường dẫn tương đối.
- Ngoại lệ được import thẳng file con: `import type ...`, `*.constants.ts`, `*.types.ts` (không được import feature khác).
- Thêm feature mới: thêm tên vào mảng `FEATURES` trong `.eslintrc.js`.

## 3. Bên trong một feature

```
features/<tên>/
├── index.ts              Cổng công khai (chỉ export thứ feature khác được dùng)
├── <tên>.constants.ts    Hằng của feature
├── Components/           UI (mỗi file một component lớn); component nhỏ vào small/
│   └── small/
├── hooks/                *.helper.ts (hàm thao tác) + *.headless.ts (chỉ useEffect)
├── Selectors/            *.selector.ts
├── store/                *.store.ts (Zustand) + Providers
├── service/              *.service.ts (gọi API)
├── types/                *.type(s).ts
├── utils/                *.utils.ts (hàm thuần, không phụ thuộc gì)
├── contexts/             Menu chuột phải (+ helpers/)
└── shell/                <tên>.module.ts(x) + <tên>.filterConfig.ts: cắm feature vào shell
```

Không feature nào có đủ mọi thư mục; có cái nào dùng cái đó. Tính năng lớn chia **tính năng con** thành thư mục lồng cùng khung (vd `project/task/` có `Components/ hooks/ store/ utils/`).

### Tên file (chi tiết rule: `CLAUDE.md`)

| Loại | Mẫu |
|---|---|
| UI | `ModuleName.tsx` |
| helper / headless / selector / store | `useModuleName.helper.ts` / `.headless.ts` / `.selector.ts` / `.store.ts` |
| service / type / constants / utils | `moduleName.service.ts` / `.type.ts` / `.constants.ts` / `.utils.ts` |

## 4. Cắm feature vào shell

Feature tự đăng ký, **không sửa shell**:
1. Tạo `features/<tên>/shell/<tên>.module.ts(x)`.
2. Import nó **trực tiếp** (không qua cổng, tránh vòng khởi tạo) và đăng ký trong `shell/modules.config.ts`.
3. Thêm tên vào `FEATURES` trong `.eslintrc.js`.

Cùng file `module` đăng ký luôn context menu, filter, plugin command palette.

## 5. Cụm feature gắn chặt

`project`, `taskDetail`, `multiProject` là một cụm: `project` là gốc, chung store (`usePTaskStore`, `useProjectStore`). Gọi qua lại trong cụm là chủ ý, nhưng vẫn **chỉ qua cổng**. Muốn tách hẳn thì rút `projectCore` dùng chung (ghi trong `features/project/index.ts`).

## 6. Ngoài `src/`

```
extension/, browser-extension/   Tiện ích trình duyệt đi kèm
database-objects/                Định nghĩa đối tượng DB
test/                            Test ngoài src
public/, build/                  Tĩnh / kết quả build
```
