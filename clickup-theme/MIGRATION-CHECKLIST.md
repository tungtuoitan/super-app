# 📋 MUI → shadcn/ui Migration Checklist

## 🎯 Pre-Migration

- [ ] Backup toàn bộ code (git commit/branch)
- [ ] Document các MUI customizations đang dùng
- [ ] List tất cả MUI components được sử dụng trong app
- [ ] Chụp screenshots UI hiện tại để so sánh
- [ ] Tạo branch mới: `git checkout -b feature/shadcn-migration`
- [ ] Review architecture document (đã có sẵn)

---

## ⚙️ Phase 1: Setup (1-2 giờ)

### Dependencies Installation
- [ ] `npm install tailwindcss @tailwindcss/vite`
- [ ] `npm install -D @types/node`

### Configuration Files
- [ ] Update `vite.config.ts` với Tailwind plugin và path alias
- [ ] Update `tsconfig.json` thêm baseUrl và paths
- [ ] Update `tsconfig.app.json` thêm baseUrl và paths
- [ ] Replace `src/index.css` với Tailwind import

### shadcn/ui Initialization
- [ ] Run `npx shadcn@latest init`
  - [ ] Chọn style: Default hoặc New York
  - [ ] Chọn base color: Neutral
  - [ ] CSS variables: Yes
  - [ ] Import alias: @/components
  - [ ] Utils alias: @/lib/utils
- [ ] Verify `src/components/ui/` folder được tạo
- [ ] Verify `src/lib/utils.ts` được tạo

### Verification
- [ ] Run `npm run dev` - app vẫn chạy được
- [ ] Check console - không có errors
- [ ] Verify hot reload vẫn hoạt động

---

## 🎨 Phase 2: ClickUp Theme Setup (30 phút)

### Color Configuration
- [ ] Copy ClickUp CSS variables vào `src/index.css`
- [ ] Verify primary color: `#7B68EE` (purple)
- [ ] Verify accent pink: `#FD71AF`
- [ ] Verify accent blue: `#49CCF9`
- [ ] Verify accent yellow: `#FFC800`
- [ ] Verify dark base: `#292D34`

### Testing Theme
- [ ] Install test button: `npx shadcn@latest add button`
- [ ] Tạo test page với Button component
- [ ] Verify button có màu purple (#7B68EE)
- [ ] Test hover, focus states
- [ ] Test dark mode (nếu có)

---

## 🔄 Phase 3: Component Migration (1-3 tuần)

### Install Core Components
- [ ] `npx shadcn@latest add button`
- [ ] `npx shadcn@latest add input`
- [ ] `npx shadcn@latest add label`
- [ ] `npx shadcn@latest add card`
- [ ] `npx shadcn@latest add dialog`
- [ ] `npx shadcn@latest add dropdown-menu`
- [ ] `npx shadcn@latest add table`
- [ ] `npx shadcn@latest add tabs`
- [ ] `npx shadcn@latest add select`
- [ ] `npx shadcn@latest add popover`
- [ ] `npx shadcn@latest add tooltip`
- [ ] `npx shadcn@latest add badge`
- [ ] `npx shadcn@latest add separator`
- [ ] `npx shadcn@latest add avatar`
- [ ] `npx shadcn@latest add checkbox`
- [ ] `npx shadcn@latest add switch`
- [ ] `npx shadcn@latest add radio-group`

### Module 1: shared/components/ui/
- [ ] Identify MUI components trong folder này
- [ ] Replace Button components
- [ ] Replace Input components
- [ ] Replace Card components
- [ ] Test từng component sau khi replace
- [ ] Update exports trong index files
- [ ] Commit: "feat: migrate shared/components/ui to shadcn"

### Module 2: features/auth/
- [ ] List components cần migrate trong auth module
- [ ] Replace LoginForm components
- [ ] Replace AuthGuard components
- [ ] Update imports
- [ ] Test login flow hoàn chỉnh
- [ ] Test form validation
- [ ] Test error states
- [ ] Commit: "feat: migrate auth module to shadcn"

### Module 3: shared/components/feedback/
- [ ] Replace Alert components
- [ ] Replace Toast/Snackbar components
- [ ] Setup Toaster provider (nếu cần)
- [ ] Test alert displays
- [ ] Test toast notifications
- [ ] ErrorBoundary (keep as is hoặc update styling)
- [ ] Commit: "feat: migrate feedback components to shadcn"

### Module 4: layouts/
- [ ] Migrate AppLayout
- [ ] Migrate AuthLayout
- [ ] Migrate DashboardLayout
- [ ] Update navigation components
- [ ] Update sidebar components
- [ ] Test responsive behavior
- [ ] Test all routes với layouts mới
- [ ] Commit: "feat: migrate layouts to shadcn"

### Module 5: Main Feature (notes/ hoặc feature chính)
- [ ] List tất cả components trong feature này
- [ ] Migrate NoteGrid/NoteCard components
- [ ] Migrate NoteDialog/NoteForm
- [ ] Migrate NoteFilters
- [ ] Update all child components
- [ ] Test CRUD operations
- [ ] Test filtering/sorting
- [ ] Test pagination
- [ ] Commit: "feat: migrate notes feature to shadcn"

### Module 6: shared/components/data-display/
- [ ] Migrate DataGrid (hoặc add data-table)
- [ ] Migrate Table components
- [ ] Setup sorting/filtering với shadcn table
- [ ] Test pagination
- [ ] Test row selection
- [ ] Commit: "feat: migrate data-display to shadcn"

---

## 🧪 Phase 4: Testing & Cleanup (3-5 ngày)

### Comprehensive Testing
- [ ] Test toàn bộ user flows
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test dark mode (nếu có)
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Test performance (lighthouse scores)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Test trên các devices thật

### Visual QA
- [ ] So sánh với screenshots ban đầu
- [ ] Verify colors match ClickUp design
- [ ] Check spacing, padding consistency
- [ ] Check typography consistency
- [ ] Check hover/focus states
- [ ] Check animations/transitions

### Code Cleanup
- [ ] Search và remove unused MUI imports
  ```bash
  grep -r "@mui/material" src/
  ```
- [ ] Remove MUI theme configuration files
- [ ] Remove MUI dependencies từ package.json
  ```bash
  npm uninstall @mui/material @emotion/react @emotion/styled
  ```
- [ ] Clean up unused CSS files
- [ ] Update .eslintrc (nếu có MUI-specific rules)

### Documentation Updates
- [ ] Update README.md
- [ ] Update component documentation
- [ ] Update setup instructions
- [ ] Document new component patterns
- [ ] Update contributing guidelines (nếu có)

### Performance Verification
- [ ] Run bundle analyzer
  ```bash
  npm run build
  # Check build size
  ```
- [ ] Compare bundle size với MUI version
- [ ] Verify load time improvements
- [ ] Check Lighthouse scores

---

## 📦 Phase 5: Additional Features (Optional)

### Advanced Components (nếu cần)
- [ ] Install react-resizable-panels
  ```bash
  npm install react-resizable-panels
  ```
- [ ] Install tree view library
  ```bash
  npm install react-arborist
  ```
- [ ] Install code editor
  ```bash
  npm install @monaco-editor/react
  ```
- [ ] Install drag & drop
  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable
  ```
- [ ] Install rich text editor
  ```bash
  npm install @tiptap/react @tiptap/starter-kit
  ```

### Implement Complex Features
- [ ] Setup resizable panels layout
- [ ] Implement folder tree navigation
- [ ] Integrate code editor
- [ ] Setup drag & drop for Kanban
- [ ] Setup rich text editor for descriptions

---

## 🚀 Phase 6: Deployment

### Pre-deployment Checks
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Build succeeds without errors
  ```bash
  npm run build
  ```
- [ ] Preview production build
  ```bash
  npm run preview
  ```

### Deployment
- [ ] Merge branch vào main/develop
- [ ] Deploy to staging environment
- [ ] QA testing trên staging
- [ ] Deploy to production
- [ ] Monitor for issues

### Post-deployment
- [ ] Monitor error tracking (Sentry, etc.)
- [ ] Check analytics for user behavior changes
- [ ] Gather user feedback
- [ ] Document lessons learned

---

## 📊 Progress Tracking

### Overall Progress
**Tổng số modules cần migrate:** _[Điền số]_  
**Modules đã hoàn thành:** _[Điền số]_  
**Phần trăm hoàn thành:** _[Tính toán]%_

### Time Tracking
- **Setup Phase:** _____ giờ / 2 giờ dự kiến
- **Theme Setup:** _____ phút / 30 phút dự kiến
- **Component Migration:** _____ ngày / 1-3 tuần dự kiến
- **Testing:** _____ ngày / 3-5 ngày dự kiến
- **Total:** _____ / _____ dự kiến

### Issues Encountered
<!-- Ghi chú các vấn đề gặp phải và cách giải quyết -->

1. **Issue:** 
   - **Solution:** 

2. **Issue:** 
   - **Solution:** 

---

## 🎉 Completion Criteria

Migration được coi là hoàn thành khi:
- [ ] ✅ 100% MUI components đã được replace
- [ ] ✅ Không còn MUI dependencies trong package.json
- [ ] ✅ App functionality giữ nguyên 100%
- [ ] ✅ UI match với ClickUp design system
- [ ] ✅ Performance tốt hơn hoặc bằng version MUI
- [ ] ✅ All tests passing
- [ ] ✅ Documentation đã được cập nhật
- [ ] ✅ Production deployment thành công
- [ ] ✅ Không có critical bugs sau 1 tuần production

---

**Created:** [Ngày bắt đầu]  
**Target Completion:** [Ngày dự kiến hoàn thành]  
**Actual Completion:** [Ngày hoàn thành thực tế]

**Team Members:**
- [ ] Developer 1: _______________
- [ ] Developer 2: _______________
- [ ] QA: _______________

---

> 💡 **Tip:** Commit code thường xuyên sau mỗi module migration để dễ rollback nếu cần!
