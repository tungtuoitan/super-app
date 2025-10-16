# SuperApp - Personal Knowledge Management System

**Version:** 3.0  
**Last Updated:** October 14, 2025

---

## 🎯 Vision

A flexible, workspace-based knowledge management system that organizes tags, files, and data through multiple contextual views - like having multiple lenses to view the same information.

---

## 🏗️ Core Concepts

### 1. **Tags = Entities**
- Tags represent real-world entities (people, projects, topics, etc.)
- Globally unique but context-aware
- Can have different relationships in different workspaces

### 2. **Workspaces = Contexts**
- Each workspace provides a different organizational view
- Same tags can have different parent-child relationships per workspace
- Think: VSCode workspaces or Gmail labels

### 3. **Files = Content**
- Markdown, code, images, videos, PDFs
- Can belong to multiple tags simultaneously

### 4. **Database Records = Structured Data**
- Tasks, projects, notes with custom fields
- Schema-flexible (define your own types)
- Linked to tags and files

---

## 📊 Data Model
reference data documents: C:\Users\Admin\source\super-app\SuperApp-frontend\docs\DB\00-INDEX.md

**Key Innovation**: Same tag can have different parents in different workspaces
- Example: "React" is child of "Learning" in Workspace A
- Example: "React" is child of "Projects > AppDev" in Workspace B

---

## 🎨 User Experience

### Primary View: Tree (like VSCode)
```
📁 Workspace: Projects ▼
├─ ▼ Active
│  ├─ 🏷️ AppDev (12 files)
│  │  ├─ 🏷️ Frontend
│  │  └─ 🏷️ Backend
│  └─ 🏷️ Research (5 files)
└─ ▶ Archive
```

### Secondary View: Graph (like Obsidian) (future feature)
- Separate feature for exploration
- Shows relationships across workspaces
- Clusters, filters, and focus modes


## 🎨 UI/UX Principles

- **70% the same as VS code**

## 🎯 Competitive Positioning

### vs Notion
- ✅ Faster (no network latency)
- ✅ More flexible (multiple workspaces)
- ✅ Better privacy (local-first)
- ❌ No real-time collaboration (Phase 4)
- ❌ No mobile app (Phase 4)

### vs Obsidian
- ✅ Database records (tasks, projects)
- ✅ Multiple organizational views
- ✅ Better file management
- ❌ Less mature plugin ecosystem
- ❌ No mobile app yet

### vs VSCode
- ✅ Built for knowledge management
- ✅ Non-code files (markdown, images)
- ✅ Graph view for connections
- ❌ Not for programming (Phase 2+)
- ❌ No Git integration (yet)

