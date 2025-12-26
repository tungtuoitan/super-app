# shadcn theme adapter

Tệp `shadcn.ts` cung cấp một adapter nhỏ để chuyển các design token hiện có (colors, spacing, borderRadius, typography) sang một tập CSS custom properties (CSS variables) thuận tiện cho việc dùng chung với shadcn/ui hoặc các component dựa trên CSS variables.

Mục đích

- Giữ nguyên source-of-truth token trong `src/lib/theme`.
- Cung cấp một hàm `applyShadcnTheme(document.documentElement)` để set CSS variables toàn cục.

Tokens bao gồm

- Màu: `--shadcn-col-primary`, `--shadcn-col-secondary`, `--shadcn-col-bg`, `--shadcn-col-surface`, `--shadcn-col-text-primary`, `--shadcn-col-text-secondary`, `--shadcn-col-border`, và `--shadcn-neutral-<scale>`.
- Spacing: `--shadcn-space-<n>` (theo keys trong `spacing`).
- Border radius: `--shadcn-radius-<key>` (ví dụ `--shadcn-radius-button`).
- Fonts: `--shadcn-font-primary`, `--shadcn-font-secondary`, `--shadcn-font-mono`.
- Typography sizes: `--shadcn-typo-h1`, `--shadcn-typo-h2`, `--shadcn-typo-h3`, `--shadcn-typo-body`, `--shadcn-typo-small`.

Ví dụ dùng (trong entry file như `src/index.tsx`):

```ts
import { applyShadcnTheme } from "@/lib/theme/shadcn";

// set CSS variables on page load
applyShadcnTheme(document.documentElement);

// Now CSS variables are available for components and tailwind/shadcn config
```

Gợi ý tích hợp với Tailwind or shadcn:

- Nếu dùng Tailwind, bạn có thể map CSS variables vào `tailwind.config.js` để dùng trong tiện ích. Hoặc trực tiếp dùng biến trong CSS: `color: var(--shadcn-col-primary)`.

Nếu bạn muốn tôi cập nhật `tailwind.config.js` để bắc cầu các biến này hoặc tạo `src/lib/theme/shadcn.css` chứa mapping :root, nói tôi biết và tôi sẽ làm tiếp.
