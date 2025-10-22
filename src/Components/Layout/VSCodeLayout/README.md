# VS Code Style Layout Components

Bộ component UI giống VS Code, bao gồm đầy đủ các phần: Activity Bar, Side Bar, Editor Area, Panel, và Status Bar.

## 🎯 Quick Start

```typescript
import { VSCodeLayout } from '@/components/Layout/VSCodeLayout'

function App() {
  return <VSCodeLayout />
}
```

## 📦 Components

### VSCodeLayout (Main)
Layout chính tích hợp tất cả components.

### ActivityBar
Thanh icons dọc bên trái (48px).

**Props:**
- `activeView: ActivityBarView` - View hiện tại
- `onViewChange: (view: ActivityBarView) => void` - Callback khi đổi view

### SideBar  
Thanh bên với nội dung động (300px).

**Props:**
- `activeView: ActivityBarView` - View hiện tại
- `isVisible: boolean` - Hiện/ẩn
- `onClose: () => void` - Callback đóng sidebar

### EditorArea
Khu vực editor với tabs.

**Props:**
- `tabs?: EditorTab[]` - Danh sách tabs (optional)

### Panel
Bảng dưới với Terminal, Problems, Output, Debug.

**Props:**
- `isVisible: boolean` - Hiện/ẩn
- `onClose: () => void` - Callback đóng panel

### StatusBar
Thanh trạng thái (22px).

**Props:** Không có props.

## 🎨 Theming

Sử dụng VS Code Dark Theme colors:

```typescript
activityBar: rgb(51, 51, 51)
sideBar: rgb(37, 37, 38)  
editor: rgb(30, 30, 30)
statusBar: #007acc
```

## 📖 Documentation

Xem [VSCODE_LAYOUT.md](../../../docs/VSCODE_LAYOUT.md) để biết chi tiết.
