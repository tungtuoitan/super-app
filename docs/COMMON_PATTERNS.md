# 🚫 ANTI-PATTERNS - Những Gì KHÔNG NÊN LÀM

> **Triết lý**: Học từ sai lầm, tránh lỗi phổ biến.

## 🔄 State Management Anti-Patterns

1. **Context cho Server State**: Không dùng Context quản lý data từ server. Dùng React Query cho cache, refetch, loading.

2. **Storing Derived State**: Không lưu state tính toán được. Tính trực tiếp hoặc useMemo nếu tốn tài nguyên.

3. **Prop Drilling**: Không truyền props qua nhiều cấp. Dùng Context cho state chia sẻ app-wide.

4. **Too Much State**: Không nhồi tất cả vào một component. Tách server (Query), UI global (Context), local (useState).

## 🧩 Component Anti-Patterns

5. **Massive Components**: Giới hạn <200 dòng. Tách nhỏ, tái sử dụng.

6. **Inline Object/Array Creation**: Tránh tạo mới trong render. Dùng sx hoặc định nghĩa ngoài.

7. **Index as Key**: Không dùng index cho list. Dùng unique ID.

8. **Conditional Hooks**: Luôn gọi hooks top-level, dùng enabled kiểm soát.

## 🪝 Hook Anti-Patterns

9. **useEffect for Everything**: Không sync props-state. Dùng props trực tiếp hoặc lưu edited values.

10. **Missing Dependencies**: Include đầy đủ hoặc thay bằng React Query.

## ⚡ Performance Anti-Patterns

11. **Premature Optimization**: Chỉ memo/useCallback khi cần.

12. **Not Virtualizing Long Lists**: Dùng react-window cho list dài.

## 🔒 Type Safety Anti-Patterns

13. **Using `any`**: Dùng proper types hoặc unknown + guards.

14. **Type Assertions Without Validation**: Validate trước khi assert.

## 🌐 API Anti-Patterns

15. **Not Handling Errors**: Sử dụng try/catch, boundaries, hiển thị lỗi user-friendly.

16. **Fetching in useEffect**: Dùng React Query tự handle.

## 🎨 Styling Anti-Patterns

17. **Inline Styles**: Dùng sx hoặc styled components.

18. **Magic Numbers**: Dùng theme tokens/constants.

## 🧪 Testing Anti-Patterns

19. **Testing Implementation Details**: Test user-visible behavior.

20. **Unnecessary Context Subscriptions**: Pass callbacks qua props tránh re-render thừa.

## 📝 Quick Reference

| Anti-Pattern | Solution |
|--------------|----------|
| Context server | React Query |
| Derived state | Calculate/useMemo |
| Prop drilling | Context |
| Massive components | Tách nhỏ |
| Index key | Unique ID |
| Conditional hooks | Top-level/enabled |
| useEffect everywhere | React Query |
| Type any | Proper types |
| No error handling | Try/catch/boundaries |
| Inline styles | sx/styled |
| Context subscriptions | Props callbacks |

**Nhớ**: Review, linting, kinh nghiệm giúp tránh.

# ⚡ STATE & COMPONENT MANAGEMENT - Key Principles

> **Philosophy**: Right tool for job. Components simple, state predictable.

## 🧩 State Management

### Categories & Tools

| Type | Tool | Example |
|------|------|---------|
| Server | React Query | API data: notes, profile |
| Global UI | Context | Auth, theme |
| Feature UI | Feature Context | Filters, dialogs |
| Local UI | useState/Reducer | Inputs, toggles |
| URL | Router | Page, filters |
| Form | React Hook Form | Validation forms |

### Best Practices

- Colocate minimal: State gần dùng, tránh lift thừa.
- Single truth: Không duplicate.
- Avoid derived: Compute/useMemo.
- Optimistic updates: Fast feedback qua Query.
- Custom hooks: Encapsulate logic.
- Decision Tree: Server → Query, Shared → Context, Local → State/Reducer, URL → Params, Form → RHF.

## 🏗️ Component Patterns

### Architecture

Hierarchy: Pages (thin, routing) → Layouts (structure, nav) → Features (logic, queries) → Shared (pure, reusable).

Types:

- Presentational: Read-only, props-based, memoized.
- Interactive: Updates, context, forms.

Guidelines:

- Size: <200 dòng, tách nếu complex.
- Props: Clear types, avoid drilling.
- Performance: Memo, useMemo/Callback, lazy, virtualization.
- Conditional: Early returns, ternary/config.

Core: State minimal/colocated, derive possible; components focused, composable.