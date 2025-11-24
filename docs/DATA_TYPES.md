# 🚫 ANTI-PATTERNS - Những Gì KHÔNG NÊN LÀM

> **Triết lý**: Học từ lỗi lầm, tránh sai sót phổ biến.

## 🔄 State Management

1. **Context cho Server State**: Tránh dùng Context xử lý data API. Chuyển sang React Query để tự động cache và refetch.

2. **Storing Derived State**: Không lưu state tính toán được. Ưu tiên compute trực tiếp hoặc useMemo.

3. **Prop Drilling**: Hạn chế truyền props sâu. Sử dụng Context chia sẻ state app-wide.

4. **Too Much State**: Phân tách rõ: Server qua Query, UI global qua Context, local qua useState.

## 🧩 Component

5. **Massive Components**: Giới hạn <200 dòng, tách nhỏ để dễ tái sử dụng.

6. **Inline Object/Array**: Định nghĩa ngoài render hoặc dùng sx prop.

7. **Index as Key**: Luôn dùng unique ID cho list items.

8. **Conditional Hooks**: Gọi hooks top-level, kiểm soát bằng enabled.

## 🪝 Hook

9. **useEffect for Everything**: Không sync props-state; ưu tiên props direct hoặc edited values.

10. **Missing Dependencies**: Đảm bảo đầy đủ, hoặc thay bằng React Query.

## ⚡ Performance

11. **Premature Optimization**: Chỉ áp dụng memo khi thực sự cần.

12. **Not Virtualizing Long Lists**: Sử dụng react-window cho danh sách lớn.

## 🔒 Type Safety

13. **Using `any`**: Thay bằng proper types hoặc unknown + guards.

14. **Type Assertions Without Validation**: Luôn validate trước assert.

## 🌐 API

15. **Not Handling Errors**: Áp dụng try/catch và boundaries, hiển thị thông báo user.

16. **Fetching in useEffect**: Chuyển sang React Query tự quản lý.

## 🎨 Styling

17. **Inline Styles**: Dùng sx hoặc styled components.

18. **Magic Numbers**: Áp dụng theme tokens/constants.


## 📝 Quick Reference

| Anti-Pattern | Solution |
|--------------|----------|
| Context server | React Query |
| Derived state | Compute/useMemo |
| Prop drilling | Context |
| Massive comp | Tách nhỏ |
| Index key | Unique ID |
| Conditional hooks | Top-level/enabled |
| useEffect everywhere | React Query |
| Type any | Proper types |
| No error handling | Try/catch/boundaries |
| Inline styles | sx/styled |
| Context subscriptions | Props callbacks |

**Nhớ**: Review và linting giúp phát hiện sớm.

# ⚡ STATE & COMPONENT MANAGEMENT - Nguyên Tắc Chính

> **Triết lý**: Công cụ phù hợp, component đơn giản, state dễ dự đoán.

## 🧩 State Management

### Phân Loại & Công Cụ

| Loại | Công Cụ | Ví Dụ |
|------|---------|-------|
| Server | React Query | Data API: notes, profile |
| Global UI | Context | Auth, theme |
| Feature UI | Feature Context | Filters, dialogs |
| Local UI | useState/Reducer | Inputs, toggles |
| URL | Router | Page, filters |
| Form | React Hook Form | Forms validation |

### Nguyên Tắc Hay

- Colocate tối thiểu: State gần nơi dùng, tránh nâng cấp thừa.
- Single truth: Không lặp lại.
- Tránh derived: Compute/useMemo.
- Optimistic updates: Feedback nhanh qua Query.
- Custom hooks: Đóng gói logic phức tạp.
- Decision Tree: Server → Query, Shared → Context, Local → State/Reducer, URL → Params, Form → RHF.

## 🏗️ Component Patterns

### Cấu Trúc

Hierarchy: Pages (thin, routing) → Layouts (cấu trúc, nav) → Features (logic, queries) → Shared (pure, reusable).

Loại:

- Presentational: Read-only, props-based, memoized.
- Interactive: Updates, context, forms.

Hướng Dẫn:

- Kích thước: <200 dòng, tách nếu phức tạp.
- Props: Types rõ, tránh drilling.
- Performance: Memo, useMemo/Callback, lazy, virtualization.
- Conditional: Early returns, ternary/config.

Core: State tối giản/colocated, derive tối đa; component tập trung, composable.