# 🎯 React DnD Setup Documentation

## 📋 Tóm tắt

Dự án sử dụng **react-arborist** (cho tree view) và **react-mosaic-component** (cho layout panels) - cả hai đều phụ thuộc vào **react-dnd** cho chức năng drag & drop.

---

## ✅ Giải pháp đã triển khai

### 1. **npm overrides** để thống nhất phiên bản react-dnd

Trong `package.json`:

```json
{
  "overrides": {
    "react-dnd": "16.0.1",
    "react-dnd-html5-backend": "16.0.1"
  }
}
```

**Lý do:**
- `react-arborist@3.4.3` yêu cầu `react-dnd@^14.0.3`
- `react-mosaic-component@6.1.1` sử dụng `react-dnd@16.0.1`
- Override ép cả hai thư viện dùng chung `react-dnd@16.0.1`
- **react-dnd v14 và v16 tương thích API** (cả hai dùng Hooks API)

### 2. **Centralized DndProvider** trong Main.tsx

```tsx
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export function Main() {
    return (
        <BrowserRouter>
            <SnackbarProvider autoHideDuration={3000}>
                <DndProvider backend={HTML5Backend}>
                    {/* All other providers */}
                </DndProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}
```

**Vị trí trong provider hierarchy:**
```
BrowserRouter
└── SnackbarProvider
    └── DndProvider ← Đặt ở đây để cả hai thư viện dùng chung
        └── AuthProvider
            └── TagUIProvider
                └── NoteUIProvider
                    └── DialogProvider
                        └── ContextMenuProvider
                            └── App Content
```

---

## 🔧 Cách sử dụng

### ✅ **react-arborist** (Tree component)

```tsx
import { Tree } from 'react-arborist';

function MyTreeView() {
    return (
        <Tree
            data={treeData}
            width={300}
            height={600}
            indent={24}
            rowHeight={32}
        >
            {/* Tree sẽ tự động sử dụng DndProvider từ context */}
        </Tree>
    );
}
```

**KHÔNG CẦN** wrap lại với DndProvider!

---

### ✅ **react-mosaic-component** (Layout panels)

```tsx
import { Mosaic, MosaicWindow } from 'react-mosaic-component';
import 'react-mosaic-component/react-mosaic-component.css';

function MyLayout() {
    return (
        <Mosaic
            renderTile={(id) => (
                <MosaicWindow title={id}>
                    {id === 'tree' ? <MyTreeView /> : <ContentPanel />}
                </MosaicWindow>
            )}
            initialValue={{
                direction: 'row',
                first: 'tree',
                second: 'content'
            }}
        />
    );
}
```

**KHÔNG CẦN** wrap lại với DndProvider!

---

### ✅ **Kết hợp cả hai**

```tsx
function App() {
    return (
        <Mosaic
            renderTile={(id) => (
                <MosaicWindow title={id}>
                    {id === 'sidebar' && (
                        <Tree
                            data={treeData}
                            // Cả Tree và Mosaic đều dùng chung DndProvider
                        />
                    )}
                    {id === 'main' && <MainContent />}
                </MosaicWindow>
            )}
            initialValue={{
                direction: 'row',
                first: 'sidebar',
                second: 'main',
                splitPercentage: 20
            }}
        />
    );
}
```

**Drag & drop hoạt động cho:**
- ✅ Tree nodes (react-arborist)
- ✅ Panel resizing (react-mosaic)
- ✅ Panel dragging/rearranging (react-mosaic)

---

## ⚠️ LƯU Ý QUAN TRỌNG

### ❌ **KHÔNG làm như thế này:**

```tsx
// ❌ SAI - Tạo DndProvider thứ hai
function MyComponent() {
    return (
        <DndProvider backend={HTML5Backend}>
            <Tree data={data} />
        </DndProvider>
    );
}
// Lỗi: "Cannot have two MultiBackends at the same time"
```

### ✅ **Làm như thế này:**

```tsx
// ✅ ĐÚNG - Sử dụng DndProvider đã có từ Main.tsx
function MyComponent() {
    return <Tree data={data} />;
}
```

### 🔧 **CRITICAL: Use MosaicWithoutDragDropContext**

`react-mosaic-component` tự động tạo DndProvider nội bộ. Để sử dụng DndProvider từ Main.tsx, **BẮT BUỘC** phải dùng `MosaicWithoutDragDropContext`:

```tsx
// ❌ SAI - Mosaic tự tạo DndProvider
import { Mosaic } from 'react-mosaic-component';

// ✅ ĐÚNG - Mosaic sử dụng DndProvider từ parent
import { MosaicWithoutDragDropContext as Mosaic } from 'react-mosaic-component';

// Usage
<Mosaic renderTile={renderTile} value={currentNode} onChange={setCurrentNode} />
```

**Lý do**:
- `Mosaic` = Có DndProvider built-in
- `MosaicWithoutDragDropContext` = Không có DndProvider, sử dụng từ parent context
- Cả hai thư viện (react-arborist và react-mosaic) đều cần chung một DndProvider

---

## 🔍 Kiểm tra cài đặt

Chạy lệnh sau để xác nhận cả hai thư viện đều dùng chung react-dnd:

```bash
npm ls react-dnd react-dnd-html5-backend
```

**Kết quả mong đợi:**

```
frontend@0.1.0
├─┬ react-arborist@3.4.3
│ ├── react-dnd-html5-backend@16.0.1 overridden
│ └── react-dnd@16.0.1 overridden
└─┬ react-mosaic-component@6.1.1
  ├── react-dnd-html5-backend@16.0.1 deduped
  └── react-dnd@16.0.1 deduped
```

Chú ý từ khóa **"overridden"** và **"deduped"** - nghĩa là chỉ có **một instance duy nhất** của react-dnd.

---

## 🚀 Tại sao đây là giải pháp tốt nhất?

1. ✅ **Thống nhất phiên bản**: Cả hai thư viện dùng chung `react-dnd@16.0.1`
2. ✅ **Tương thích API**: react-dnd v14 và v16 đều dùng Hooks API
3. ✅ **Single source of truth**: Chỉ một DndProvider duy nhất
4. ✅ **Tuân theo architecture**: Centralized providers trong Main.tsx
5. ✅ **Không breaking changes**: Không cần refactor code hiện tại
6. ✅ **Performance**: Không có duplicate contexts

---

## 📦 Dependencies

Các package cần thiết (đã cài đặt):

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-arborist": "^3.4.3",
    "react-mosaic-component": "^6.1.1"
  }
}
```

**react-dnd** và **react-dnd-html5-backend** được cài tự động như peer dependencies.

---

## 🐛 Troubleshooting

### Lỗi: "Cannot have two MultiBackends at the same time"

**Nguyên nhân:** Có nhiều hơn một DndProvider trong component tree

**Giải pháp:**
1. Xóa tất cả DndProvider trong các component con
2. Chỉ giữ lại DndProvider trong `Main.tsx`

### Lỗi: "Cannot read property 'useDrag' of undefined"

**Nguyên nhân:** Component không nằm trong DndProvider

**Giải pháp:**
1. Kiểm tra Main.tsx có DndProvider chưa
2. Đảm bảo component được render trong Main component tree

### Drag & drop không hoạt động

**Kiểm tra:**
1. Import CSS của react-mosaic: `import 'react-mosaic-component/react-mosaic-component.css'`
2. Kiểm tra `npm ls react-dnd` có báo "overridden" không
3. Restart dev server: `npm start`

---

## 📚 Tài liệu tham khảo

- [react-arborist Documentation](https://github.com/brimdata/react-arborist)
- [react-mosaic-component Documentation](https://github.com/nomcopter/react-mosaic)
- [react-dnd Documentation](https://react-dnd.github.io/react-dnd/)
- [Project Architecture](.github/copilot-instructions.md)

---

**Cập nhật:** 2025-10-20
**Version:** 1.0.0
