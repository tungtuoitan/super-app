🧠 MỤC TIÊU HỆ THỐNG (theo đúng những gì bạn mô tả)

Bạn muốn:

Editor giống VS Code

Text là row data (không cần file thật)

Keyword tự nhiên (VN, multi-word)

Keyword:

Tô màu

Autocomplete khi gõ

Click / Ctrl+Click để đi tới định nghĩa

Hover hiện info / ảnh

Có thể hiển thị ảnh liên quan

Không nhất thiết phải dùng Markdown

👉 Đây không phải rich text kiểu Notion
👉 Đây là semantic text editor

🧩 KIẾN TRÚC TỔNG THỂ
Row Data (text)
   ↓
Keyword Indexer
   ↓
Monaco Editor
   ↓
Decorations / Providers / Widgets

🧱 CÔNG NGHỆ CẦN DÙNG (CORE STACK)
1️⃣ Monaco Editor (BẮT BUỘC)

Lõi editor của VS Code

Dùng để:

Render text

Cursor, selection

Autocomplete

Hover

Ctrl+Click

Decorations

📌 Không cần file .md, .txt

2️⃣ Keyword Indexer (TRÁI TIM HỆ THỐNG)

Bạn cần một layer riêng để quản lý keyword.

Nó làm gì?

Lưu:

keyword (string)

type (event / concept / task…)

metadata (id, ảnh, mô tả)

Search:

prefix match

multi-word

fuzzy (optional)

📌 Có thể là:

In-memory JS

Trie

SQLite / IndexedDB (nâng cao)

3️⃣ Semantic Highlight (UI giống VS Code)
Công nghệ:

editor.setModelDecorations

CSS class

Dùng để:

Tô màu keyword

Underline khi Ctrl

Hiện “link feel”

📌 Không dùng markdown

4️⃣ Autocomplete (khi gõ)
Công nghệ:

registerCompletionItemProvider

Dùng để:

Gợi ý keyword

Insert cụm từ

Popup giống VS Code

📌 Có thể:

Theo prefix

Theo context dòng

Theo loại keyword

5️⃣ Hover (tooltip thông minh)
Công nghệ:

registerHoverProvider

Dùng để:

Hiện mô tả

Hiện ảnh

Hiện metadata

📌 UX rất tốt, nhẹ

6️⃣ Click / Ctrl+Click → Go to definition
Công nghệ:

registerDefinitionProvider

Dùng để:

Nhảy tới keyword gốc

Mở panel chi tiết

Highlight nơi định nghĩa

📌 Giống hệt VS Code

7️⃣ Hiển thị ảnh (KHÔNG nhúng trực tiếp)
Công nghệ:

ContentWidget

Hover markdown image

Overlay decoration

Dùng để:

Preview ảnh

Banner sự kiện

Sơ đồ

📌 Text vẫn là text

8️⃣ Theme & UX
Công nghệ:

defineTheme

CSS

Dùng để:

Màu keyword

Trạng thái hover

VS Code look & feel