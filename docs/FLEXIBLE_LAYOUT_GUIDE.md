# FlexibleLayout - VS Code-like Layout System

## Overview

FlexibleLayout cung cấp một hệ thống layout linh hoạt giống như VS Code, cho phép người dùng:
- Chia và sắp xếp lại các panels
- Resize các panels theo ý muốn  
- Thêm và đóng các panels
- Lưu và khôi phục layout preferences

## Components

### 1. FlexibleLayout (Main Component)
- **Location**: `src/Components/Layout/FlexibleLayout.tsx`
- **Purpose**: Component chính quản lý toàn bộ layout system
- **Features**:
  - Mosaic-based layout với drag & drop
  - Preset layouts (Single, Two Columns, Three Columns)
  - Layout persistence (localStorage)
  - Dynamic panel management

### 2. NoteGridPanel
- **Location**: `src/Components/Layout/NoteGridPanel.tsx`
- **Purpose**: Hiển thị danh sách notes trong DataGrid
- **Features**:
  - Tích hợp với React Query (`useNotes`)
  - Click để mở note detail
  - Loading và error states
  - Empty state handling

### 3. TagsPanelReal
- **Location**: `src/Components/Layout/TagsPanelReal.tsx`
- **Purpose**: Hiển thị danh sách tags
- **Features**:
  - Tích hợp với React Query (`useTags`)
  - Click để select tag
  - Color coding cho tags
  - Compact list layout

### 4. NoteDetailPanelReal
- **Location**: `src/Components/Layout/NoteDetailPanelReal.tsx`
- **Purpose**: Hiển thị và chỉnh sửa chi tiết note
- **Features**:
  - View/Edit modes
  - Tích hợp với `useNoteUI` context
  - Mutation handling với `useUpdateNote`
  - Metadata display

## Integration

### MainNav Integration

FlexibleLayout đã được tích hợp vào `MainNav.tsx`:

```tsx
// Routes sử dụng FlexibleLayout
<Routes>
    <Route path="/" element={<FlexibleLayout />} />
    <Route path="/notes" element={<FlexibleLayout />} />
    <Route path="/tags" Component={TagsPage} />
</Routes>
```

### Provider Requirements

Các providers cần thiết đã có sẵn trong `Main.tsx`:
- `QueryClientProvider` (React Query)
- `NoteUIProvider` (Note UI state)
- `TagUIProvider` (Tag UI state)

## Usage Examples

### 1. Default Layout
Khi load lần đầu, FlexibleLayout sẽ hiển thị với layout 3 cột:
- Left: Tags Panel
- Center: Notes Grid  
- Right: Note Detail

### 2. Layout Controls
```tsx
// Có thể thêm controls để quản lý layout
const layoutControls = (
  <Box>
    <Button onClick={() => setLayout('single')}>Single Panel</Button>
    <Button onClick={() => setLayout('twoColumn')}>Two Columns</Button>
    <Button onClick={() => setLayout('threeColumn')}>Three Columns</Button>
  </Box>
)
```

### 3. Adding New Panels
Để thêm panel mới:

1. Định nghĩa ViewId mới:
```tsx
export type ViewId = 'notes' | 'tags' | 'noteDetail' | 'properties' | 'newPanel'
```

2. Tạo component mới:
```tsx
const NewPanelComponent = () => <YourNewComponent />
```

3. Thêm vào COMPONENT_MAP:
```tsx
const COMPONENT_MAP = {
  // existing panels...
  newPanel: NewPanelComponent,
}
```

4. Thêm title:
```tsx
const TITLE_MAP: Record<ViewId, string> = {
  // existing titles...
  newPanel: 'New Panel',
}
```

## Styling

### CSS Classes
Custom styles trong `FlexibleLayout.css`:
- `.mosaic-window`: Style cho window containers
- `.mosaic-window-toolbar`: Style cho title bars
- `.mosaic-split`: Style cho split handles

### MUI Theme Integration
Tất cả components sử dụng MUI theme system:
- `theme.palette.primary`
- `theme.spacing()`
- `theme.typography`

## Layout Persistence

FlexibleLayout tự động lưu layout vào localStorage:

```tsx
// Save layout
const saveLayout = () => {
  if (currentNode) {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(currentNode))
  }
}

// Load layout
const loadLayout = (): MosaicNode<ViewId> | null => {
  const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
  return saved ? JSON.parse(saved) : null
}
```

## Performance Considerations

### React Query Caching
- Notes data được cache bởi React Query
- Tags data được cache riêng biệt
- Automatic refetching khi cần thiết

### Component Optimization
- Sử dụng React.memo cho các component con nếu cần
- Lazy loading cho các panels ít dùng
- Virtualization cho large lists

## Troubleshooting

### Common Issues

1. **Components không hiển thị data**
   - Kiểm tra providers đã được setup trong Main.tsx
   - Verify API endpoints đang hoạt động
   - Check React Query devtools

2. **Layout không lưu**
   - Kiểm tra localStorage permissions
   - Verify LAYOUT_STORAGE_KEY đúng format

3. **Styling issues**
   - Import FlexibleLayout.css
   - Check MUI theme setup
   - Verify CSS order

### Debug Tips

```tsx
// Enable React Query devtools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
```

## Future Enhancements

### Planned Features
1. **Panel Templates**: Pre-configured layouts cho các workflows khác nhau
2. **Floating Panels**: Panels có thể float như VS Code
3. **Panel Groups**: Nhóm các panels liên quan
4. **Keyboard Shortcuts**: Shortcuts để điều khiển layout
5. **Export/Import Layout**: Share layouts giữa users

### Extension Points
1. **Custom Panel Types**: Dễ dàng thêm panel types mới
2. **Plugin Architecture**: Support cho third-party panels  
3. **Theme Customization**: Advanced theming options
4. **Layout Analytics**: Track usage patterns

## API Reference

### FlexibleLayout Props
```tsx
interface FlexibleLayoutProps {
  className?: string
  initialLayout?: MosaicNode<ViewId>
  onLayoutChange?: (layout: MosaicNode<ViewId>) => void
}
```

### LayoutUtils Functions
```tsx
// Create single panel layout
createSingleLayout(viewId: ViewId): MosaicNode<ViewId>

// Create two column layout  
createTwoColumnLayout(left: ViewId, right: ViewId): MosaicNode<ViewId>

// Create three column layout
createThreeColumnLayout(left: ViewId, center: ViewId, right: ViewId): MosaicNode<ViewId>

// Add panel to layout
addPanel(layout: MosaicNode<ViewId>, viewId: ViewId, direction: 'row' | 'column'): MosaicNode<ViewId>
```