# SuperApp Companion — bot check-in tâm lý trên trình duyệt

**Fullpath:** /browser-extension/README.md

Con bot nhỏ thỉnh thoảng bò ra góc phải dưới trang web, hỏi **1 câu** check-in. Câu trả lời được ghi
thành comment vào task tracker trên SuperApp (TungRoot #1485, tracker #1486). Extension Chrome/Edge
(Manifest V3), JS thuần, không cần build.

## Cài (Chrome hoặc Edge, 1 lần)

1. Mở `chrome://extensions` (Edge: `edge://extensions`) và bật **Developer mode**.
2. Bấm **Load unpacked**, chọn thư mục `browser-extension/` này.
3. Mở https://www.tungle.uk và đăng nhập trong **cùng trình duyệt**. Bot dùng luôn phiên đăng nhập
   đó, không cần nhập mật khẩu hay token.
4. Bấm icon extension → popup hiện "Bộ câu hỏi: 8 câu" là xong. Thử **Hỏi thử ngay** trên một
   trang web bất kỳ.

Sửa code xong thì bấm ⟳ ở thẻ extension trong `chrome://extensions`.

Tab đã mở từ trước khi cài/reload extension: bot tự gắn vào khi cần (quyền `scripting`), không phải
reload trang. Riêng tab mới, `chrome://`, `edge://`, cửa hàng extension, trình xem PDF thì trình
duyệt không bao giờ cho extension chạy — bot chỉ hiện ở trang web thường.

## Cách bot quyết định hỏi (scheduler.js)

- Tối đa `maxPerDay` câu/ngày (mặc định 3), cách nhau ít nhất `minGapMinutes` (mặc định 2h), chỉ
  trong khoảng `activeFrom`–`activeTo`.
- Chỉ hiện khi: máy đang có người dùng (không idle/khoá), tab đang hiển thị, không fullscreen, và
  **20 giây gần nhất không gõ phím**.
- Câu hỏi bị che sau bong bóng trung tính "Có 1 câu hỏi nhỏ"; phải bấm vào bot mới hiện nội dung.
- Phản hồi:
  - Trả lời: comment `track` `[id] giá trị — nhãn · ghi chú`.
  - Để sau: hỏi lại sau `snoozeMinutes`, không tính vào số câu.
  - Bận, bỏ qua / Tệ, không muốn nói: comment `skip:busy` / `skip:bad`.
  - Tắt hôm nay: comment `skip:today`, im tới mai.
  - Không phản hồi sau `ignoreAfterSeconds`: bot tự đi, ghi `skip:none`. Bị lờ liên tiếp thì khoảng
    cách giãn ra (2h → 4h → 6h → 8h). Có tương tác thì quay lại 2h.
- Câu weekly: từ `fromWeekday`, mỗi ngày tối đa 1 câu (riêng CN hỏi nốt). Đã trả lời thì hết tuần.
- Mất mạng hoặc chưa đăng nhập: câu trả lời nằm trong hàng đợi, tự gửi lại ở lượt sau (2 phút/lần).

## Bộ câu hỏi

Nằm trong **description của task tracker** (khối ```json```), không nằm trong code. Sửa ở đó, bot
tự tải lại sau tối đa 6 giờ, hoặc bấm **Tải lại bộ câu hỏi** trong popup. Không có bộ câu hỏi thì
bot không hỏi gì.

## Quyền riêng tư

- Content script **không đọc nội dung trang**. Nó chỉ nghe sự kiện gõ phím để biết lúc nào nên
  tránh, và vẽ bot trong shadow root đóng (trang web không đọc được).
- Không lưu mật khẩu. Access token ngắn hạn chỉ nằm trong `chrome.storage.session` (bộ nhớ).
- Chrome sẽ cảnh báo "đọc và thay đổi dữ liệu trên mọi trang web". Đó là quyền để bot hiện được ở
  mọi trang; code ở đây không dùng quyền đó để đọc trang.

## Test

```bash
node --test tests/scheduler.test.js
```
