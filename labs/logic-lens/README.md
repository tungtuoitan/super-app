# Logic Lens

Dán code (hoặc một thay đổi code), nhận sơ đồ từng bước của logic: trực quan, đơn giản, bấm vào đâu cũng thấy đúng dòng code tương ứng. Với thay đổi code, sơ đồ vẽ **toàn bộ luồng** và đánh dấu đúng những ô đã thêm, sửa hoặc xoá.

## Dùng thế nào

**Code** (một đoạn code bất kỳ: hàm, component React, API handler, stored procedure, script, worker… bằng TS/JS, Python, Go, C#, Java, Kotlin, Rust, PHP, SQL, Bash…)

1. Dán code vào khung bên trái.
2. Bấm **Vẽ sơ đồ**. Trên claude.ai trang gọi Claude bằng tài khoản của bạn (lần đầu sẽ hỏi quyền). Ở nơi khác, mở “Dùng Claude ở nơi khác”: copy prompt, dán vào Claude, rồi dán câu trả lời về.
3. Bấm một ô để xem giải thích và đoạn code của ô đó. Bấm một dòng code để chọn ô chứa nó.
4. **Đi từng bước** để đọc lần lượt (← → để chuyển ô, Esc để thoát).

**Thay đổi code** (ví dụ: luồng đang chạy tốt, có bug, AI sửa và đưa ra một thay đổi)

1. Chọn chế độ **Thay đổi code** ở trên cùng.
2. Dán code **Trước** và **Sau**, hoặc dán một bên rồi bấm **Dán git diff** để dựng lại bên còn lại.
3. Bấm **Vẽ sơ đồ thay đổi**. Sơ đồ là luồng đầy đủ của code Sau; ô có nhãn **+ MỚI** / **~ SỬA** / **− XOÁ** là chỗ đã thay đổi, kèm lý do. Khung code Sau đánh dấu các dòng thêm (xanh) và chỗ có dòng bị xoá (vạch đỏ).
4. Bật **chỉ chỗ thay đổi** để đi lần lượt qua từng chỗ đã đổi.

Đánh dấu của Claude được đối chiếu với diff thật: ô có dòng code bị đổi mà Claude quên đánh dấu sẽ tự được đánh dấu “đã sửa”.

Code giao diện (React, Vue, Angular, mobile…) được vẽ theo **hành trình người dùng**: mỗi phần là một thao tác, đánh số theo thứ tự người dùng gặp (1. Mở trang → 2. Bấm “Sửa” → 3. Trong hộp thoại bấm “Lưu”…), kèm những gì màn hình hiện ra (nhãn MÀN HÌNH) và chỗ chuyển trang.

Menu **Ví dụ…** có 17 ví dụ có sẵn sơ đồ: 14 loại code (trang quản lý sản phẩm theo thao tác người dùng, React, Express, Redux, state machine, Go worker pool, Python async, C# controller, Java đệ quy, Kotlin coroutine, Rust, PHP job, SQL, Bash) và 3 thay đổi sửa bug (JS, Python, SQL).

**Bảng dữ liệu**: mỗi ô ghi bảng / entity nó đọc hay ghi (`▤ orders sửa`). Dải **Dữ liệu** phía trên liệt kê mọi bảng; bấm một bảng để sáng lên các bước đụng tới nó và xem bước nào đọc, bước nào ghi.

**Chạy thử**: bấm **▶ Chạy thử** để đi theo đúng đường code chạy, từng ô một. Ở chỗ rẽ nhánh bạn chọn đi nhánh nào (hoặc bấm phím 1–9), cuối vòng lặp chọn lặp tiếp hay thoát; các ô đã đi qua giữ vết. Chọn một **kịch bản** (ví dụ “Sửa giá thành công”) để tự chạy. Với trang giao diện, nhánh kết thúc “về màn hình” quay lại câu hỏi “Người dùng làm gì?” để bấm tiếp như khi dùng thật.

## Đọc sơ đồ

| Hình | Nghĩa |
|---|---|
| Ô xanh ngọc có nhãn NGƯỜI DÙNG | người dùng thao tác: mở trang, bấm nút, gõ, chọn |
| Ô đen bo tròn | điểm bắt đầu khác (request, sự kiện, lời gọi hàm, lịch chạy) |
| Ô trắng | một bước |
| Ô có vạch hai bên | gọi sang hàm / dịch vụ khác |
| Ô xanh | giai đoạn chính |
| Ô có dải xanh trên đầu | một nhánh: chỉ một nhánh chạy |
| Ô có dải tím, thanh ngang đậm | các nhánh chạy song song |
| Khung chấm có mũi tên quay lại | vòng lặp |
| Ô bo tròn có nhãn RETURN / THROW… | dừng tại đây; nhánh này không gộp lại |
| Khung có vạch trái | một điểm vào riêng (hàm khác, callback, handler khác) |
| Viền đỏ đứt | đáng chú ý |
| Nhãn nhỏ góc phải (DB, API, FILE…) | bước có tác động ra ngoài |
| Nhãn **+ MỚI**, **~ SỬA**, **− XOÁ** | phần đã thay đổi; ô bị xoá vẽ gạch ngang, nét đứt |

Trên điện thoại, các nhánh xếp dọc theo một thanh bên trái, và phần giải thích trượt lên từ dưới.

## Sửa sơ đồ bằng chữ

Tab **Dạng chữ**: mỗi dòng là một ô, thụt lề cho các ô con; sơ đồ cập nhật ngay khi gõ.

```
title: Webhook thanh toán
change: Thêm chống xử lý trùng theo event.id.
start  POST /webhooks/payments [API] | nhà cung cấp gọi   @1-2
step   Kiểm tra chữ ký [AUTH] | sai: trả 400               @3-6
+warn  Ghi nhận event.id [DB]                             @9-10
  >> Mỗi sự kiện chỉ được xử lý một lần.
+branch Đã xử lý chưa?
  lane   Trùng
    end:respond 200 duplicate
  lane   Lần đầu
parallel
  lane   Gửi email [API]
  lane   Giữ kho [DB]
loop   Với mỗi món
  step   Trừ tồn
  end:continue Bỏ qua hàng số
group  Gộp dữ liệu
  item   Orders
  note   chỉ đơn chưa huỷ
section onFailure() | handler khác
  step   Ghi log
```

- Loại ô: `start`, `step`, `call`, `stage`, `warn`, `end` (`end:throw`, `end:respond`, `end:break`, `end:continue`, `end:exit`), `branch`/`parallel` + `lane`, `loop`, `group` + `item`/`note`, `section`.
- ` | ` ngăn tiêu đề và dòng phụ; `[DB]` gắn nhãn; `@12-40` dòng code; `!` cuối dòng đánh dấu đáng chú ý.
- `>` dòng giải thích; `+` `~` `-` đầu dòng: thêm / sửa / xoá; `>>` lý do thay đổi; `change:` tóm tắt thay đổi.
- `$ orders read, order_lines insert` dưới một ô: bảng nó đọc / ghi (`read`, `insert`, `update`, `delete`, `write`); `table: orders | một đơn hàng` mô tả bảng; `scenario: Lưu thành công > tải được > Lưu` một kịch bản chạy thử (tên nhánh chọn ở mỗi chỗ rẽ).

Xuất: Copy Mermaid, copy dạng chữ, tải SVG / PNG.

## Cấu trúc

```
src/
  flow.js           mô hình sơ đồ, chuẩn hoá câu trả lời của Claude, đoán ngôn ngữ
  flow-text.js      định dạng chữ (đọc / ghi) và xuất Mermaid
  flow-run.js       chạy thử: đi theo đường code, hỏi ở chỗ rẽ nhánh, theo kịch bản
  prompt.js         lời nhắc gửi Claude (code hoặc thay đổi code) và đọc câu trả lời dán vào
  diff.js           diff dòng (Myers), đối chiếu đánh dấu thay đổi, đọc / áp git diff
  layout.js         xếp ô; layout-lanes.js: nhánh và song song (cạnh nhau hoặc xếp dọc)
  svg.js            vẽ SVG theo theme sáng / tối
  highlight.js      tô màu cú pháp; editor.js: khung code có số dòng và dấu thay đổi
  sample.js         ba ví dụ gốc (SQL, JavaScript, Python)
  app-core.js       trạng thái, bản nháp, khung code, chế độ code / thay đổi
  app-diagram.js    sơ đồ trên trang: zoom, chọn ô, giải thích, đi từng bước
  app-data.js       dải bảng dữ liệu; app-run.js: thanh chạy thử
  app.js            gọi Claude, ví dụ, xuất file, nối mọi thứ lại
build.mjs           gộp thành dist/logic-lens.html (+ .standalone.html), kèm các ví dụ trong test/corpus
test/               unit test (node --test), e2e Chromium (Playwright, giả lập window.claude), corpus ví dụ
```

## Lệnh

```bash
npm test
```

```bash
npm run e2e
```
