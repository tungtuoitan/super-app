# SuperApp Chrome Extension — Tổng quan công nghệ

## 1. Chrome Extension Manifest V3 (MV3)

Extension hiện đại dùng **Manifest V3** — tiêu chuẩn mới nhất của Chrome.  
File cấu hình: `manifest.config.ts` (được build thành `manifest.json`).

Có 3 loại script chính:

| Loại | File | Chạy ở đâu |
|------|------|------------|
| **Background service worker** | `src/background.ts` | Chạy nền trong browser, không có DOM |
| **Content script** | `src/content.ts`, `src/review/review-content.ts` | Chạy bên trong trang web (Facebook, YouTube...) |
| **Popup** | `src/popup/popup.tsx` | Chạy khi click icon extension |

---

## 2. Build toolchain: Vite + CRXJS

- **Vite**: Build tool hiện đại, nhanh hơn Webpack nhiều lần. Config tại `vite.config.ts`.
- **@crxjs/vite-plugin**: Plugin đặc biệt giúp Vite hiểu cấu trúc extension — tự động xử lý `manifest.config.ts`, hot-reload khi dev, bundle đúng từng entry point.

Lệnh:
```
npm run dev    # dev mode, hot reload
npm run build  # build ra thư mục dist/
```

Sau khi build, load thư mục `dist/` vào `chrome://extensions` (bật Developer mode).

---

## 3. Content Scripts và Shadow DOM

**Content script** là JS được inject vào trang web (Facebook, Instagram, YouTube).  
Vấn đề: CSS của trang web có thể làm hỏng UI của extension.

**Giải pháp: Shadow DOM**
```ts
const host = document.createElement("div");
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: "open" });
// Mọi thứ bên trong shadow hoàn toàn cô lập với trang web
```

CSS của Facebook/YouTube không xuyên vào được Shadow DOM. Ta inject style riêng vào shadow root.

---

## 4. Background Service Worker

Service worker chạy nền, **không có DOM**, **có thể bị sleep** khi idle (đặc trưng MV3).

Tại sao cần service worker:
- **CORS**: Content script chạy trong origin của Facebook → không fetch được `tungle.uk`. Service worker không bị giới hạn CORS.
- **Credentials**: Service worker có thể gửi cookie HttpOnly (dùng `credentials: "include"`) để refresh token.

Giao tiếp giữa content script ↔ service worker:
```ts
// Content script gửi
chrome.runtime.sendMessage({ type: "SA_REVIEW_FETCH" })

// Service worker nhận
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "SA_REVIEW_FETCH") {
        // fetch API rồi gọi sendResponse(...)
        return true; // QUAN TRỌNG: giữ channel mở cho async
    }
})
```

`return true` là bắt buộc nếu `sendResponse` được gọi bất đồng bộ, nếu không channel bị đóng trước khi response về.

---

## 5. Auto Token Refresh

JWT access token có thời hạn ngắn. Flow tự động refresh:

1. User paste access token vào popup một lần → lưu vào `chrome.storage.local`
2. Mỗi lần fetch API, service worker decode JWT để kiểm tra `exp` (expiry)
3. Nếu token hết hạn trong vòng 2 phút → tự động gọi `POST /api/auth/refresh` với `credentials: "include"`
4. Browser tự gửi cookie HttpOnly (refresh token) mà không cần JS đọc cookie
5. Lưu access token mới vào storage

```ts
function getJwtExpiryMs(token: string): number | null {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
}
```

---

## 6. React trong Extension

React được dùng để render **ReviewOverlay** (popup review câu hỏi) bên trong Shadow DOM.

```ts
import { createRoot } from "react-dom/client";

const container = document.createElement("div");
shadow.appendChild(container);
const root = createRoot(container);
root.render(React.createElement(ReviewOverlay, props));
```

Không dùng JSX trực tiếp trong content script entry point vì file đó là `.ts`, nhưng component `.tsx` vẫn dùng JSX bình thường.

---

## 7. Shiki — Syntax Highlighting

**Shiki** render code với màu sắc giống VS Code, dùng TextMate grammar.

- Dùng theme `dark-plus` (theme mặc định của VS Code Dark)
- Render ra HTML với inline styles → hoạt động tốt trong Shadow DOM (không cần CSS class bên ngoài)
- Lazy load: chỉ khởi tạo một lần, cache lại instance

```ts
getShikiHighlighter().then(hl => {
    const html = hl.codeToHtml(code, { lang: "typescript", theme: "dark-plus" });
});
```

---

## 8. Marked — Markdown Rendering

**Marked** parse markdown thành HTML. Dùng để render question và answer có format:

- Inline code: `` `SemaphoreSlim` ``
- Bold: `**text**`
- List: `- item`
- Paragraph với line breaks

```ts
marked.setOptions({ breaks: true }); // \n thành <br>
marked.parse(text)       // full markdown (có <p>, <ul>...)
marked.parseInline(text) // chỉ inline (không wrap thêm <p>)
```

---

## 9. chrome.storage.local

Lưu trữ dữ liệu persistent cho extension:

| Key | Giá trị |
|-----|---------|
| `sa_review_token` | JWT access token để gọi API review |
| `sa_access_token` | Token cho tính năng capture ảnh |
| `sa_token_expires_at` | Timestamp hết hạn |

```ts
// Lưu
await chrome.storage.local.set({ sa_review_token: token });
// Đọc
const r = await chrome.storage.local.get("sa_review_token");
```

---

## 10. Scroll Lock & Video Pause

Hai kỹ thuật đặc thù dùng để block trang web khi popup đang hiển thị:

### Scroll lock
`overflow: hidden` trên body **không hoạt động** với Facebook (FB dùng scroll container riêng).  
Giải pháp: chặn event ở capture phase:
```ts
window.addEventListener("wheel", blocker, { passive: false, capture: true });
window.addEventListener("keydown", keyBlocker, { capture: true });
```

### Video pause
Facebook chặn `video.pause()` — video tự play lại ngay.  
Giải pháp: dùng `setInterval` để pause liên tục mỗi 600ms khi popup active.

---

## 11. Cấu trúc thư mục

```
extension/
├── manifest.config.ts       # Cấu hình extension
├── vite.config.ts           # Cấu hình build
├── src/
│   ├── background.ts        # Service worker (fetch API, CORS bypass)
│   ├── content.ts           # Content script cho tính năng capture ảnh
│   ├── popup/
│   │   ├── popup.tsx        # UI popup khi click icon
│   │   └── popup.css
│   ├── review/
│   │   ├── review-content.ts    # Content script inject vào FB/IG/YT
│   │   ├── ReviewOverlay.tsx    # React component popup review
│   │   ├── reviewApi.ts         # API calls (qua message passing)
│   │   └── shikiHighlighter.ts  # Shiki singleton
│   └── lib/
│       ├── auth.ts          # Google OAuth flow
│       ├── storage.ts       # chrome.storage helpers
│       ├── upload.ts        # Upload ảnh
│       └── toast.ts         # Hiển thị toast notification
└── dist/                    # Output sau khi build (load vào Chrome)
```

---

## 12. Setup & Deploy

```bash
# Cài dependencies
npm install

# Build
npm run build

# Load extension vào Chrome
# 1. Mở chrome://extensions
# 2. Bật "Developer mode" (góc trên phải)
# 3. Click "Load unpacked"
# 4. Chọn thư mục dist/

# Sau mỗi lần thay đổi code: build lại → vào chrome://extensions → click nút reload (↺)
```

Để lấy token:
1. Vào web app SuperApp → Settings → Copy Token
2. Mở popup extension → dán vào ô "K Review Token" → Save
