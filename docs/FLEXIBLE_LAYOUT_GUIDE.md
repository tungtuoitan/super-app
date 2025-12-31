# FlexibleLayout - VS Code-like Layout System

## Overview

Hệ thống layout linh hoạt giống VS Code, hỗ trợ chia/sắp xếp/resize panels, thêm/đóng panels, lưu/khôi phục preferences.

## Components

### 1. FlexibleLayout (Main Component)

- Location: src/Components/Layout/FlexibleLayout.tsx
- Quản lý layout mosaic với drag & drop, preset layouts (Single, Two/Three Columns), persistence qua localStorage, dynamic panel management.

### 2. NoteGrid

- Location: src/Components/Layout/NoteGrid.tsx
- Hiển thị notes trong DataGrid, dùng useNotes, click mở detail, handle loading/error/empty states.

### 3. TagsPanelReal

- Location: src/Components/Layout/TagsPanelReal.tsx
- Hiển thị tags list, dùng useTags, click select, color coding, compact layout.

### 4. NoteDetailPanelReal

- Location: src/Components/Layout/NoteDetailPanelReal.tsx
- Hiển thị/chỉnh sửa note detail, view/edit modes, dùng useNoteDetailStore, mutations với useUpdateNote, metadata display.

## Integration

### MainNav Integration

Tích hợp Routes: path "/" và "/notes" dùng FlexibleLayout, "/tags" dùng TagsPage.

### Provider Requirements

QueryClientProvider, NoteDetailProvider, TagUIProvider setup trong Main.tsx.

## Usage Examples

- Default: 3 cột (Tags left, Notes center, Detail right).
- Layout Controls: Buttons set single/two/three columns.
- Adding New Panels: Thêm ViewId, component, vào COMPONENT_MAP và TITLE_MAP.

## Styling

- CSS: mosaic-window, -toolbar, -split.
- MUI: palette, spacing, typography.

## Layout Persistence

Lưu/đọc MosaicNode từ localStorage.

## Performance Considerations

- React Query cache notes/tags, auto refetch.
- React.memo/lazy/virtualization cho optimization.

## Troubleshooting

### Common Issues

- No data: Check providers/API.
- Layout không lưu: Storage permissions.
- Styling: Import CSS, check theme/CSS order.

### Debug Tips

Thêm ReactQueryDevtools.

## Future Enhancements

### Planned Features

- Panel Templates/floating/groups.
- Keyboard shortcuts.
- Export/import layout.
- Analytics.

### Extension Points

- Custom panels.
- Plugin architecture.
- Theme customization.

## API Reference

### FlexibleLayout Props

className?, initialLayout?, onLayoutChange?.

### LayoutUtils Functions

createSingleLayout, createTwoColumnLayout, createThreeColumnLayout, addPanel.
