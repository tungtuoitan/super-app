# 🎨 VS Code Style Layout

Giao diện tương tự VS Code với đầy đủ các thành phần chính.

## 📚 Cấu trúc Layout

```
┌────────────────────────────────────────────────────────────┐
│                     VS Code Layout                          │
├──────┬──────────┬─────────────────────────────────────────┤
│      │          │                                          │
│      │          │         Editor Area                      │
│  A   │  Side    │         (Tabs + Content)                │
│  c   │  Bar     │                                          │
│  t   │          │                                          │
│  i   │          ├─────────────────────────────────────────┤
│  v   │          │                                          │
│  i   │          │         Panel                            │
│  t   │          │         (Terminal, Problems, etc)       │
│  y   │          │                                          │
│      │          │                                          │
│  B   │          │                                          │
│  a   │          │                                          │
│  r   │          │                                          │
│      │          │                                          │
├──────┴──────────┴─────────────────────────────────────────┤
│                    Status Bar                               │
└────────────────────────────────────────────────────────────┘
```

## 🗂 Các Thành Phần

### 1. Activity Bar (Thanh hoạt động)
- **Vị trí**: Cột dọc ngoài cùng bên trái (48px)
- **Màu nền**: `rgb(51, 51, 51)`
- **Chức năng**: Chuyển đổi giữa các view (Explorer, Search, Source Control, Debug, Extensions)
- **Icons**: Material-UI icons

**Views có sẵn:**
- 🗂 Explorer (`explorer`) - Ctrl+Shift+E
- 🔍 Search (`search`) - Ctrl+Shift+F  
- 🌿 Source Control (`sourceControl`) - Ctrl+Shift+G
- 🐞 Run and Debug (`debug`) - Ctrl+Shift+D
- 🧩 Extensions (`extensions`) - Ctrl+Shift+X

### 2. Side Bar (Thanh bên)
- **Vị trí**: Bên trong Activity Bar (300px)
- **Màu nền**: `rgb(37, 37, 38)`
- **Chức năng**: Hiển thị nội dung chi tiết của view được chọn
- **Có thể ẩn/hiện**: Click lại icon trong Activity Bar

**Nội dung theo view:**
- **Explorer**: Danh sách file/folder (tree view)
- **Search**: Tìm kiếm và thay thế
- **Source Control**: Git status
- **Debug**: Launch configuration
- **Extensions**: Marketplace extensions

### 3. Editor Area (Khu vực chỉnh sửa)
- **Vị trí**: Chính giữa
- **Màu nền**: `rgb(30, 30, 30)`
- **Chức năng**: Hiển thị và chỉnh sửa file

**Tabs Bar:**
- Hiển thị các file đang mở
- Đánh dấu file đã thay đổi (● trước tên file)
- Có thể đóng từng tab (icon X)
- Tab đang active có màu nền khác

**Editor Content:**
- Syntax highlighting (màu code)
- Line numbers
- Monospace font (Consolas, Courier New)

### 4. Panel (Bảng dưới)
- **Vị trí**: Dưới Editor Area (250px)
- **Màu nền**: `rgb(30, 30, 30)`
- **Chức năng**: Hiển thị terminal, problems, output, debug console

**Tabs có sẵn:**
- **Terminal**: Integrated terminal
- **Problems**: Danh sách lỗi/warnings (với badge số lượng)
- **Output**: Extension logs
- **Debug Console**: Debug output

### 5. Status Bar (Thanh trạng thái)
- **Vị trí**: Dưới cùng (22px)
- **Màu nền**: `#007acc` (VS Code blue)
- **Chức năng**: Hiển thị thông tin trạng thái

**Thông tin hiển thị:**
- **Left side**:
  - Git branch (master-dev)
  - Sync status (↓0 ↑0)
  - Errors/Warnings count
  
- **Right side**:
  - Line/Column number
  - Spaces/Tabs
  - Encoding (UTF-8)
  - Line ending (CRLF/LF)
  - Language mode
  - Notifications icon

## 🎨 Theme Colors

```typescript
// VS Code Dark Theme
const colors = {
  activityBar: 'rgb(51, 51, 51)',
  sideBar: 'rgb(37, 37, 38)',
  editor: 'rgb(30, 30, 30)',
  panel: 'rgb(30, 30, 30)',
  statusBar: '#007acc',
  
  // Text
  text: '#cccccc',
  textDim: 'rgba(255, 255, 255, 0.6)',
  textBright: '#fff',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  
  // Highlights
  activeTab: 'rgb(30, 30, 30)',
  hover: 'rgba(255, 255, 255, 0.1)',
  selection: 'rgba(255, 255, 255, 0.05)',
  
  // Syntax highlighting
  keyword: '#c586c0',
  string: '#ce9178',
  function: '#dcdcaa',
  variable: '#9cdcfe',
  number: '#b5cea8',
  comment: '#6a9955',
}
```

## 📦 Component Usage

### Basic Usage

```typescript
import { VSCodeLayout } from '@/components/Layout/VSCodeLayout'

function App() {
  return (
    <Box sx={{ width: '100vw', height: '100vh' }}>
      <VSCodeLayout />
    </Box>
  )
}
```

### Individual Components

```typescript
import { 
  ActivityBar, 
  SideBar, 
  EditorArea, 
  Panel, 
  StatusBar 
} from '@/components/Layout/VSCodeLayout'

function CustomLayout() {
  const [activeView, setActiveView] = useState('explorer')
  
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <ActivityBar activeView={activeView} onViewChange={setActiveView} />
      <SideBar activeView={activeView} isVisible={true} onClose={() => {}} />
      <Box sx={{ flex: 1 }}>
        <EditorArea />
        <Panel isVisible={true} onClose={() => {}} />
      </Box>
      <StatusBar />
    </Box>
  )
}
```

## ⌨️ Keyboard Shortcuts (Planned)

```typescript
// Sẽ implement trong tương lai
Ctrl+B         - Toggle sidebar
Ctrl+J         - Toggle panel
Ctrl+Shift+E   - Show Explorer
Ctrl+Shift+F   - Show Search
Ctrl+Shift+G   - Show Source Control
Ctrl+Shift+D   - Show Debug
Ctrl+Shift+X   - Show Extensions
Ctrl+Shift+P   - Command Palette (future)
Ctrl+\         - Split editor (future)
Ctrl+W         - Close editor tab
```

## 🎯 Features Implementation Status

### ✅ Đã Hoàn Thành

- [x] Activity Bar với 5 views
- [x] Side Bar với dynamic content
- [x] Editor Area với tabs
- [x] Panel với 4 tabs (Terminal, Problems, Output, Debug)
- [x] Status Bar với full info
- [x] Dark theme (VS Code style)
- [x] Hover effects
- [x] Toggle sidebar/panel
- [x] Close tabs functionality
- [x] Responsive icons

### 🚧 Chưa Triển Khai (Chỉ UI)

- [ ] Keyboard shortcuts
- [ ] Command Palette (Ctrl+Shift+P)
- [ ] Split editor
- [ ] Drag & drop tabs
- [ ] Context menus
- [ ] Search functionality
- [ ] Git integration
- [ ] Debug functionality
- [ ] Extension management
- [ ] Settings UI
- [ ] File tree functionality
- [ ] Actual code editing

## 📝 Customization

### Thay đổi màu sắc

```typescript
// Trong StatusBar.tsx
sx={{
  backgroundColor: '#ff6600', // Thay đổi màu status bar
}}

// Trong ActivityBar.tsx
sx={{
  backgroundColor: 'rgb(60, 60, 60)', // Thay đổi màu activity bar
}}
```

### Thêm view mới

```typescript
// 1. Thêm vào ActivityBarView type
export type ActivityBarView = 'explorer' | 'search' | 'sourceControl' | 'debug' | 'extensions' | 'myNewView'

// 2. Thêm icon vào activities array
const activities = [
  // ... existing activities
  { id: 'myNewView' as const, icon: MyIcon, label: 'My View', shortcut: 'Ctrl+Shift+M' },
]

// 3. Thêm content vào SideBar
function MyNewView() {
  return <Box>My custom content</Box>
}

const viewComponents = {
  // ... existing views
  myNewView: <MyNewView />,
}
```

### Thay đổi kích thước

```typescript
// Activity Bar width
sx={{ width: '48px' }} // Mặc định 48px

// Side Bar width
sx={{ width: '300px' }} // Mặc định 300px

// Panel height
sx={{ height: '250px' }} // Mặc định 250px

// Status Bar height
sx={{ height: '22px' }} // Mặc định 22px
```

## 🔗 Files Structure

```
src/components/Layout/VSCodeLayout/
├── ActivityBar.tsx          # Thanh hoạt động bên trái
├── SideBar.tsx             # Thanh bên (dynamic content)
├── EditorArea.tsx          # Khu vực editor + tabs
├── Panel.tsx               # Panel dưới (terminal, problems, etc)
├── StatusBar.tsx           # Thanh trạng thái
├── VSCodeLayout.tsx        # Main layout component
└── index.ts                # Public exports
```

## 🚀 Next Steps

Để triển khai chức năng thực tế:

1. **File Explorer**: Tích hợp với workspace file system
2. **Search**: Implement tìm kiếm trong files
3. **Terminal**: Tích hợp xterm.js hoặc terminal emulator
4. **Editor**: Tích hợp Monaco Editor (editor của VS Code)
5. **Git**: Tích hợp isomorphic-git
6. **Keyboard Shortcuts**: Implement hotkey system
7. **Command Palette**: Fuzzy search command interface
8. **Settings**: Persistent configuration storage

## 📚 References

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [VS Code UI Layout](https://code.visualstudio.com/docs/getstarted/userinterface)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Material-UI Icons](https://mui.com/material-ui/material-icons/)

---

**Note**: Đây là UI mockup, chưa có chức năng thực tế. Tất cả interactions chỉ là demo để thể hiện cách layout hoạt động.
