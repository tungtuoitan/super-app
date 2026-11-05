# Logic Lens

Dán code, nhận sơ đồ từng bước của logic để hiểu nhanh: trực quan, đơn giản, bấm vào đâu cũng thấy đúng dòng code tương ứng.

## Dùng thế nào

1. Dán code vào khung bên trái: stored procedure, API handler, hàm TS/C#/Python/Java/Go…
2. Bấm **Vẽ sơ đồ bằng Claude**.
   - Trên claude.ai, trang gọi Claude bằng tài khoản của bạn (lần đầu sẽ hỏi quyền).
   - Ở nơi khác, dùng mục "Dùng Claude ở nơi khác": copy prompt, dán vào Claude, rồi dán câu trả lời về.
3. Bấm vào một ô để xem giải thích và đoạn code của ô đó. Bấm vào một dòng code để chọn ô chứa nó.
4. **Đi từng bước** để đọc lần lượt từ trên xuống (← → để chuyển ô, Esc để thoát).

## Đọc sơ đồ

| Hình | Nghĩa |
|---|---|
| Ô trắng | một bước |
| Ô xanh | giai đoạn chính |
| Ô viền xanh có dải trên | một nhánh: chỉ một nhánh chạy, rồi gộp lại |
| Ô bo tròn xám | dừng tại đây (return / throw / exit); nhánh này không gộp lại |
| Khung chấm có mũi tên quay lại | vòng lặp |
| Viền đỏ đứt | đáng chú ý |
| Nhãn vàng trên chỗ rẽ nhánh | câu hỏi quyết định nhánh |

Trên điện thoại, các nhánh xếp dọc theo một thanh bên trái, và phần giải thích trượt lên từ dưới.

## Sửa sơ đồ bằng chữ

Mỗi dòng là một ô; sơ đồ cập nhật ngay khi gõ.

```
title: Thanh toán
step   Nhận yêu cầu | user, giỏ hàng        @1-4
stage  1. Tính lại giá | từ catalog          @10-18
  > Giá trong giỏ có thể đã cũ.
step   Kiểm tra giỏ | trống?
branch
  lane Giỏ trống
    end  Trả lỗi 400
  lane Có hàng
loop   Với mỗi món | trừ tồn kho
  step Trừ tồn
group  2. Gộp dữ liệu
  item Orders
  item Users | join theo user_id
  note Chỉ lấy đơn chưa huỷ
warn   Gửi mail | không chờ kết quả
```

- `@12-40` cuối dòng: các dòng code tương ứng.
- `!` cuối dòng: đánh dấu đáng chú ý.
- `>`: dòng giải thích.
- ` | ` (có dấu cách hai bên): ngăn tiêu đề và dòng phụ.

## Cấu trúc

```
src/
  flow.js         mô hình sơ đồ, chuẩn hoá câu trả lời của Claude (if/else, loop, return, dòng đánh số từ 0…)
  flow-text.js    định dạng chữ (đọc / ghi) và xuất Mermaid
  prompt.js       lời nhắc gửi Claude (giới hạn số ô, ví dụ mẫu Việt/Anh) và đọc câu trả lời dán vào
  layout.js       xếp ô: nhánh cạnh nhau hoặc xếp dọc (điện thoại), nới rộng thay vì bóp nhỏ khi lồng sâu
  svg.js          vẽ SVG theo theme sáng/tối
  sample.js       ba ví dụ có sẵn sơ đồ (SQL, JavaScript, Python)
  app-core.js     trạng thái, bản nháp, khung code
  app-diagram.js  sơ đồ trên trang: zoom, chọn ô, giải thích, đi từng bước
  app.js          gọi Claude, xuất file, nối mọi thứ lại
build.mjs         gộp thành dist/logic-lens.html (+ .standalone.html mở trực tiếp được)
test/             unit test (node --test) và e2e Chromium (Playwright, giả lập window.claude)
```

## Lệnh

```bash
npm test
```

```bash
npm run e2e
```
