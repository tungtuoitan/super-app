

# task
hiện tại ta đang có chức năng navigate các tab, nhưng chưa tốt lắm, tôi muốn update để chức năng go back, goForward giống hệt hành vi của VSCode

#
nếu cần thì hỏi thêm tôi

# 1 vài file liên quan:
C:\Users\Admin\source\SuperApp\src\hooks\vsCode\useNavigationHistory.helper.ts
C:\Users\Admin\source\SuperApp\src\HeadlessComponents\NavigationHistorySync.tsx
C:\Users\Admin\source\SuperApp\src\Components\VSCodeLayout\NavigationKeyboardShortcuts.tsx


# logic
Nguyên tắc di chuyển cốt lõi
🔹 1. User chuyển sang tab mới (chủ động)

Present được đẩy vào Past

Tab mới trở thành Present

Future bị xóa hoàn toàn

📌 Lý do: user đã rẽ sang “nhánh mới”

🔹 2. User bấm Back

Lấy tab cuối cùng trong Past

Tab đó trở thành Present

Present cũ được đẩy sang đầu Future

📌 Past giảm – Future tăng

🔹 3. User bấm Forward

Lấy tab đầu tiên trong Future

Tab đó trở thành Present

Present cũ được đẩy vào cuối Past

📌 Future giảm – Past tăng

4️⃣ Lưu được >50 tab như thế nào?
Không thay đổi logic di chuyển

👉 Chỉ thay đổi chiến lược lưu

🔹 Giới hạn chỉ áp dụng cho Past

Past có thể rất dài

Khi vượt ngưỡng (ví dụ 200):

Cắt bỏ các tab cũ nhất

Giữ lại những tab gần hiện tại

📌 Future không bị cắt vì đó là đường quay lại