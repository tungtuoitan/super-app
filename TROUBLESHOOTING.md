# 🔧 Troubleshooting Guide

## ❌ Error: 'node' is not recognized as an internal or external command

### Nguyên nhân
Node.js không có trong system PATH của Windows.

### Giải pháp

#### Option 1: Khởi động lại terminal/IDE (Khuyến nghị)
1. Đóng tất cả terminal windows
2. Đóng VS Code / IDE
3. Mở lại VS Code / IDE
4. Mở terminal mới
5. Test: `node --version`

#### Option 2: Thêm Node.js vào PATH thủ công
1. Tìm đường dẫn cài đặt Node.js (thường là):
   - `C:\Program Files\nodejs\`
   - `C:\Program Files (x86)\nodejs\`

2. Thêm vào System PATH:
   - Mở **System Properties** → **Environment Variables**
   - Trong **System Variables**, tìm `Path`
   - Click **Edit** → **New**
   - Thêm: `C:\Program Files\nodejs\`
   - Click **OK** để lưu

3. Khởi động lại terminal

#### Option 3: Sử dụng NVM (Node Version Manager)
```powershell
# Cài đặt NVM for Windows
# Download từ: https://github.com/coreybutler/nvm-windows/releases

# Sau khi cài đặt NVM:
nvm install lts
nvm use lts
```

#### Option 4: Reinstall Node.js
1. Download Node.js LTS từ: https://nodejs.org/
2. Chạy installer
3. ✅ **Chọn "Add to PATH"** trong quá trình cài đặt
4. Restart terminal

---

## ❌ Error: Module build failed - ENOENT react-dnd

### Nguyên nhân
- npm overrides đã thay đổi dependency tree
- node_modules chưa được clean install

### Giải pháp

#### Step 1: Clean install (sau khi fix Node.js PATH)
```bash
# Remove old dependencies
rm -rf node_modules
rm package-lock.json   # hoặc rm -f package-lock.json

# Clean npm cache (optional)
npm cache clean --force

# Reinstall
npm install
```

#### Step 2: Verify installation
```bash
# Check react-dnd versions
npm ls react-dnd react-dnd-html5-backend

# Expected output:
# frontend@0.1.0
# ├─┬ react-arborist@3.4.3
# │ ├── react-dnd-html5-backend@16.0.1 overridden
# │ └── react-dnd@16.0.1 overridden
# └─┬ react-mosaic-component@6.1.1
#   ├── react-dnd-html5-backend@16.0.1 deduped
#   └── react-dnd@16.0.1 deduped
```

#### Step 3: Start dev server
```bash
npm start
```

---

## ❌ Error: Cannot have two MultiBackends at the same time

### Nguyên nhân
Có nhiều hơn một `DndProvider` trong component tree.

### Giải pháp
1. Kiểm tra `Main.tsx` có duy nhất một `DndProvider`
2. Xóa tất cả `DndProvider` trong các component con
3. Đảm bảo import đúng:
   ```tsx
   import { DndProvider } from 'react-dnd';
   import { HTML5Backend } from 'react-dnd-html5-backend';
   ```

---

## ⚠️ Warning: React does not recognize prop on a DOM element

### Nguyên nhân
Passing React component props vào native DOM elements.

### Giải pháp
Sử dụng wrapper `<div>` cho DnD dragHandle:
```tsx
// ❌ Sai
<Box ref={dragHandle}>

// ✅ Đúng
<div ref={dragHandle}>
  <Box>...</Box>
</div>
```

---

## 🔍 Kiểm tra môi trường

### Verify Node.js
```bash
node --version   # Nên >= 18.0.0
npm --version    # Nên >= 9.0.0
```

### Verify dependencies
```bash
npm ls react react-dom
npm ls react-arborist react-mosaic-component
npm ls react-dnd react-dnd-html5-backend
```

### Verify overrides đang hoạt động
```bash
npm ls react-dnd

# Phải thấy "overridden" keyword:
# ├── react-dnd@16.0.1 overridden
```

---

## 🚀 Quick Reset Script

Nếu mọi thứ hỏng, chạy script này để reset hoàn toàn:

```bash
# Stop all running processes
# Ctrl+C trong terminal

# Clean everything
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force

# Reinstall
npm install

# Start fresh
npm start
```

---

## 📞 Khi nào cần help?

Nếu sau tất cả các bước trên vẫn gặp lỗi:

1. **Check npm logs**:
   ```bash
   # Log file location:
   C:\Users\Admin\AppData\Local\npm-cache\_logs\
   ```

2. **Check system info**:
   ```bash
   node --version
   npm --version
   echo %PATH%
   ```

3. **Report issue với đầy đủ thông tin**:
   - OS version: Windows 10/11
   - Node version
   - npm version
   - Full error log
   - Steps to reproduce

---

**Cập nhật:** 2025-10-20
