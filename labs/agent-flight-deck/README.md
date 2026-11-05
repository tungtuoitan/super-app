# Agent Flight Deck

Bộ "đồng hồ buồng lái" cho thời đại code cùng AI. Chạy hoàn toàn trong trình duyệt: file của bạn không bao giờ được upload.

## 1. Flight Recorder: xem lại và soi một phiên Claude Code

Thả file log phiên (`~/.claude/projects/<project>/<session>.jsonl`), hoặc cả thư mục `~/.claude/projects`, vào trang.

- **Gauges**: chi phí ước tính theo giá API, số API call, tool call, thời gian làm việc thật so với tổng thời gian, tỉ lệ cache hit, đỉnh context.
- **Findings**: tự phát hiện chỗ tốn tiền và kém hiệu quả, mỗi mục có nút nhảy tới đúng thời điểm:
  - cache bị build lại (do nghỉ lâu quá TTL, đổi model, compact) và số tiền phát sinh thêm
  - tool lỗi, edit bị từ chối, file bị đọc lặp, Bash dùng `cat/grep/find` thay tool chuyên dụng
  - tool result quá lớn, context gần chạm giới hạn, tool chạy quá 2 phút, phần chi của subagent
- **Flight path**: timeline nhiều làn (prompt, câu trả lời, thinking, tool theo màu loại, context, chi phí cộng dồn). Khoảng nghỉ dài được thu gọn và đánh dấu zigzag.
- **Replay**: nút Play phát lại phiên từng bước (1×, 4×, 16×), transcript tự cuộn theo.
- **Inspector**: input/result chính xác của tool, chi phí từng API call tách theo input / cache write / cache read / output.
  - "Same tokens on other models": tính lại chi phí phiên trên các model khác.
- **Bảng phân tích**: chi phí từng call, thống kê tool, heatmap file đã đọc/sửa, bảng các lượt (turn).
- **All sessions**: khi mở nhiều log thì có tổng quan chi tiêu theo ngày, theo project, phiên đắt nhất.
- **Copy report**: copy bản tóm tắt Markdown để dán vào PR hoặc chat nhóm.

## 2. Load Sheet: đóng gói codebase thành prompt vừa ngân sách token

Thả một thư mục project vào trang.

- **Bỏ qua tự động**: `node_modules`, build output, lockfile, binary và mọi thứ trong `.gitignore` (kể cả `.gitignore` lồng nhau). File bị ignore không bao giờ được đọc.
- **Cargo map**: treemap kích thước token của từng file. Click để load hoặc bỏ.
- **Flight plan**: gõ câu hỏi rồi bấm *Auto-load*. File được xếp hạng theo độ liên quan (kiểu TF-IDF, ưu tiên trùng tên đường dẫn) và nạp đến khi đầy ngân sách.
- **Weight & balance**: ngân sách token, phần chừa lại cho câu trả lời, báo vượt.
- **Packing**: bỏ comment nguyên dòng, gộp dòng trống, thêm cây thư mục; định dạng XML (theo khuyến nghị long-context của Anthropic: tài liệu trước, câu hỏi cuối), Markdown hoặc Plain.
- **Chi phí**: chi phí input của prompt khi gửi lần đầu và khi gửi lại có cache, trên Opus / Sonnet / Haiku / Fable.

## Số liệu dựa trên gì

- **Giá**: giá API niêm yết của Anthropic (bảng trong `src/pricing.js`, cập nhật 2026-10). Cache write tính 1.25× input (TTL 5 phút) hoặc 2× (TTL 1 giờ). Fast mode tính 2×.
- **Token trong Load Sheet** là ước lượng: tokenizer của Claude không công khai, nên ước lượng cố ý dư khoảng 10%. Cần số chính xác thì dùng API `count_tokens`.
- **Chi phí do Claude Code tự ghi** vào log (`cost-state`) được hiện riêng. Con số này có khi chỉ tính đến một thời điểm trước đó trong phiên.

## Cấu trúc

```
src/
  pricing.js            bảng giá (đối chiếu trang giá chính thức), chuẩn hoá tên model, tính chi phí một usage
  session.js            đọc .jsonl, gộp file theo phiên (giữ nguyên thứ tự file chính, bỏ dòng trùng uuid)
  session-build.js      dựng phiên: call (gộp theo message.id), tool, turn, file, tổng, đối chiếu với cost-state
  insights.js           findings (cache rebuild tránh được / không tránh được, tool lỗi, đọc lặp…)
  packer.js             .gitignore, bỏ file bí mật, ước lượng token, độ liên quan, chọn file theo ngân sách
  packer-output.js      bỏ comment an toàn (không đụng chuỗi, regex, heredoc), dựng prompt, cây thư mục, treemap
  sample.js             phiên ví dụ (đúng format log thật) + project ví dụ
  ui.js                 helper DOM, format, tooltip, đọc thư mục khi kéo thả
  recorder*.js          Flight Recorder: nạp log + danh sách phiên, timeline, phiên & replay, inspector & bảng
  loadsheet*.js         Load Sheet: nạp project + chọn file, phần hiển thị
  app.js                tab, hash routing (#recorder, #loadsheet), theme
  index.html            template; styles.css
build.mjs               gộp tất cả thành 1 file: dist/agent-flight-deck.html (+ bản .standalone.html mở trực tiếp được)
test/                   unit test (node --test) và e2e chạy Chromium thật (Playwright)
```

Mỗi file dưới 400 dòng theo quy định của repo; các file `recorder*` và `loadsheet*` chia sẻ trạng thái qua `AFD.rec` / `AFD.ls`.

## Lệnh

```bash
npm run build
npm test
node test/e2e.mjs ~/.claude/projects/<project>/<session>.jsonl path/to/some/code
```

Không có dependency nào. E2E cần Playwright và Chromium.

Dùng offline: mở `dist/agent-flight-deck.standalone.html` trực tiếp trong trình duyệt.
