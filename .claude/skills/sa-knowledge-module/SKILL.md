---
description: Context and architecture for the SuperApp Knowledge (K) module.
name: sa-knowledge-module
---
You are working on the **K (Knowledge) module** of the SuperApp — a VSCode-like personal knowledge base with tree navigation, node hierarchy, Q&A questions, spaced-repetition review (SRS), flow canvas, and a progress dashboard.

## Project Locations

| Layer | Path |
|---|---|
| Frontend (React/TS) | `C:\Users\Admin\source\SuperApp\src\features\K\` |
| Backend (.NET) | `C:\Users\Admin\source\Timeline\` |

---

## Frontend Structure

```
src/features/K/
├── Components/
│   ├── KView.tsx                        # Sidebar: knowledge dropdown + KTree
│   ├── KEditorPanel.tsx                 # Main singleton tab — 3 sub-tabs: GENERAL / K PROGRESS / Q FLOW
│   ├── KGeneral.tsx                     # Sub-tab: name / description / image editor
│   ├── KProgressDashboard.tsx           # Sub-tab: stats, charts, retention per node
│   ├── KDailyReviewSession.tsx          # Full-screen review session overlay
│   ├── KMarkdownImportPanel.tsx         # Import Q&A from markdown
│   ├── KDialog.tsx                      # Create/rename node dialog
│   ├── KExplorer/
│   │   ├── KTree.tsx                    # react-arborist tree
│   │   ├── KNode.tsx                    # Node renderer
│   │   ├── KStatusDot.tsx               # Color dot for node status
│   │   └── KTreeEmpty.tsx               # Empty state
│   ├── KMovingTree/
│   │   ├── KMovingTab.tsx               # Cross-knowledge drag-drop panel
│   │   └── KMovingTree.tsx
│   ├── KNodeEditorPanel/
│   │   ├── KNodeEditorPanel.tsx         # Node name/desc/parent editor panel
│   │   ├── KNodeCard.tsx / KInlineNodeCard.tsx
│   │   ├── KNodeDescEditor.tsx
│   │   └── NodeParentPicker.tsx
│   ├── QFlowView/
│   │   ├── KQFlowView.tsx               # Q Flow sub-tab wrapper + toolbar
│   │   ├── KQFlowCanvas.tsx             # ReactFlow canvas (wrapped in KQFlowProvider)
│   │   └── small/
│   │       ├── KQFlowNode.tsx           # Custom node renderer
│   │       └── KQFlowEdge.tsx           # Custom edge renderer
│   └── small/
│       ├── KProgressMasteryChart.tsx    # "Memory strength over time" SVG line chart
│       ├── KProgressRetentionChart.tsx  # "Avg retention" SVG line chart
│       ├── KScoreBar.tsx
│       └── KScoreSparkline.tsx
│
├── hooks/
│   ├── kTree/
│   │   ├── useK.loader.ts               # loadAllK, loadTree, createKnowledge, updateKnowledge, softDeleteKnowledge, loadDailyReviewCount
│   │   ├── useKTree.helper.ts           # handleMove (drag/drop)
│   │   ├── useKNodeSelection.helper.ts
│   │   ├── useKItem.helper.ts
│   │   ├── useKMovingTree.helper.ts
│   │   ├── useKTreeMark.helper.ts
│   │   ├── useKTreeOpenState.helper.ts
│   │   ├── useKTreeSelection.helper.ts
│   │   ├── useKTreeStatus.helper.ts
│   │   ├── kTree.miniHelper.ts          # pure utils: transformToTreeData, getAllVisibleNodeIds
│   │   └── *.headless.ts               # scroll/container height side effects
│   ├── qFlow/
│   │   ├── useKQFlow.helper.ts          # node/edge CRUD, connect, paste, delete
│   │   ├── useKQFlow.headless.ts        # syncs questions → flow nodes/edges
│   │   ├── useKQFlowCanvas.helper.ts    # edge operations, organize
│   │   ├── useKQFlowDrag.helper.ts      # node drag handlers
│   │   ├── useKQFlowStats.helper.ts     # activeQuestions, dueCount, newCount, isMaster…
│   │   ├── useKQFlowSrsReset.helper.ts  # SRS reset with confirm flow
│   │   ├── useKQFlowShortcuts.helper.ts # keyboard shortcuts (del/cut/paste/ctrl+o)
│   │   ├── useKQFlowCanvasReveal.helper.ts
│   │   └── useKQFlowWheelZoom.helper.ts
│   ├── useKTab.helper.ts                # openKnowledgeTab, openNewKnowledgeTab, openGlobalDailyReviewTab
│   ├── useKNodeDialog.helper.ts         # create/rename node dialog logic
│   ├── useKNodeEditor.loader.ts
│   ├── useKNodeTab.helper.ts
│   ├── useKSaveActions.ts
│   ├── useKMarkdownImport.helper.ts
│   └── kNodeEditor.miniHelper.ts
│
├── service/
│   ├── k.service.ts                     # knowledge CRUD, tree, node batch upsert, markdown import
│   └── kQuiz.service.ts                 # questions CRUD, SRS/daily review, retention graph
│
├── store/
│   ├── useK.store.tsx                   # allK, currentK, selectedKId, dailyReviewDueCount, pendingQuizTabSwitch…
│   ├── useKQFlow.store.tsx              # flowNodes, flowEdges, editingNodeId, positionsLoaded…
│   ├── useKMovingTree.store.tsx
│   ├── useKNodeDialog.store.tsx
│   ├── useKNodeEditor.store.tsx
│   └── KProviders.tsx                   # wraps all K-module providers
│
├── types/
│   ├── k.type.ts                        # KWsResponse, KItemAction, KWs…
│   ├── kV2.type.ts                      # KItemV2 (flat node), isFolder(), isNode()
│   ├── kDto.type.ts                     # KDTO
│   ├── kQuiz.type.ts                    # KQuestion, KDailySessionQuestion, KRetentionGraph, KDailyQueueItem…
│   ├── kQFlow.type.ts                   # KQFlowNodeData
│   ├── kMarkdownImport.type.ts          # KMdQuiz, KImportQuizMarkdownRequest…
│   └── kContext.type.ts                 # quizDropNodeIds, setQuizDropNodeIds
│
├── utils/
│   ├── k.constants.ts                   # kQFlow: "k-quiz-flow"
│   ├── kEvents.utils.ts                 # dispatchKQuizMoved, dispatchKFlowQuestionsChanged
│   ├── kQFlow.utils.ts                  # sortQuestionsByFlowOrder
│   ├── kQFlow.constants.ts
│   ├── kMapper.utils.ts
│   ├── kMenu.utils.ts
│   ├── kTempId.utils.ts
│   ├── kConfirmMessage.constants.ts
│   └── kNodeEditor.constants.ts
│
├── contexts/
│   ├── menu/
│   │   ├── KMenu.tsx                    # knowledge-selector context menu
│   │   ├── KNodeMenu.tsx                # tree node context menu
│   │   ├── KQFlowMenu.tsx               # canvas right-click menu
│   │   └── KNodePanel*.tsx
│   └── helpers/
│       ├── useKMenu.helper.ts
│       └── useKMenuDelete.helper.ts
│
└── shell/
    ├── k.module.tsx                     # registers K module in shell
    └── k.filterConfig.ts
```

---

## Backend Structure

```
SuperAppAPI/Controllers/K/
├── KController.cs                       # knowledge CRUD + tree
└── KQuestionController.cs               # questions, SRS, daily review, retention

SuperAppServices/
├── Interfaces/
│   ├── K/IKQuestionService.cs
│   └── IKKnowledgeService.cs
└── Services/K/
    ├── KQuestionService.cs              # CRUD, SubmitAnswersAsync, SubmitDailyAnswersAsync, GetRetentionGraphAsync…
    ├── KKnowledgeService.cs
    └── KGradingService.cs               # AI grading via LLM

SuperAppDataRepositories/
├── Ins/IKQuestionRepository.cs
└── Repositories/KQuestionRepository.cs

SuperAppModels/
├── Models/KQuestionEntity.cs
├── DTOs/Requests/KSubmitAnswersRequest.cs
├── DTOs/Requests/KDailySubmitRequest.cs
├── DTOs/Responses/KQuestionResponse.cs
├── DTOs/Responses/KRetentionGraphResponse.cs
└── Utils/SpacedRepetitionEngine.cs      # SM-2 + forgetting curve R = 0.9^(days/interval)×100
```

---

## Database Tables

**`k.knowledge`** — knowledge bases (workspaces)
| Column | Notes |
|---|---|
| id, user_id, name, description, image_base64 | |
| status_code | nullable |
| created_at / updated_at / deleted_at | soft delete |

**`k.node`** — folder/topic nodes inside a knowledge base
| Column | Notes |
|---|---|
| id, knowledge_id, parent_id (nullable=root) | |
| name, description, color, icon | |
| status_code | "learning" \| "draft" |
| path_ids, path_depth | materialized path |
| created_at / updated_at / deleted_at | |

**`k.question`** — Q&A flashcards
| Column | Notes |
|---|---|
| id, node_id (nullable=orphan), name (question), description (answer) | |
| status_code | "learning" \| "draft" |
| sort_order | position in flow canvas |
| srs_interval, srs_ease_factor, srs_repetitions, srs_next_review_at | SM-2 state |
| created_at / updated_at / deleted_at | |

**`k.point_history`** — per-answer score history
| Column | Notes |
|---|---|
| question_id, user_id, point (1–5), answer_text | |
| created_at | |

---

## Key Concepts

### KEditorPanel tab structure
`KEditorPanel` is a **singleton tab** (one instance, swapped data on knowledge change).  
Three sub-tabs rendered via `renderTabContent()`:
- `"general"` → `<KGeneral>` — name/desc/image form
- `"qflow"` → `<KQFlowView nodeId={selectedNodeId}>` — flow canvas for a node (null = orphan view)
- `"progress"` → `<KProgressDashboard knowledgeId={knowledge.id}>` — stats + charts

When knowledge changes (`knowledge.id` differs), the panel auto-resets to `"qflow"` tab and `selectedNodeId = null`.  
Switching knowledge in `KView` calls both `setSelectedKId` and `openKnowledgeTab(newK)` to keep them in sync.

### SRS / Spaced Repetition
- Algorithm: **SM-2** (ease factor, repetitions, interval)
- Retention formula: `R = 0.9 ^ (daysSince / interval) × 100`
- Questions have status: `"learning"` | `"draft"` (no "mastered" — removed)
- Daily review sessions: AI-graded or self-scored (1–5)
- `GetRetentionGraphAsync`: replays full SM-2 history per question → retention value per day

### KProgressDashboard data rules
- **Orphan questions excluded**: `q.nodeId != null && q.nodeId !== 0`
- **Deleted questions excluded**: filtered at load (`!q.deletedAt`)
- **Deleted/draft nodes excluded**: `nodes.filter(n => !n.deletedAt && n.statusCode !== "draft")`
- `learningQs` = learning + active node (used for Active Questions stat, node retention groups)
- `draftQs` = draft + active node (excluded from review count)
- Node retention groups: built from `learningQs` only, sorted by avgRet desc

### KProgressDashboard sections
1. **Stat cards** (4): Active Questions / Avg Retention / Due Today / Draft Questions
2. **Review streak**: 14-day grid colored by daily avg retention
3. **Charts** (2 columns):
   - "Avg retention" — `KProgressRetentionChart`: single line, Y axis 50–100%
   - "Memory strength over time" — `KProgressMasteryChart`: 3 lines (Strong ≥80% / Learning >0% / Not started =0%), counts per day
4. **Retention per node**: donut (High/Medium/Low) + list with progress bars

### Q Flow Canvas
- `KQFlowView` wraps `KQFlowProvider` + `KQFlowContent`
- Questions are loaded per `nodeId` (or orphans when `nodeId = null`)
- Nodes and edges are managed in `useKQFlow.store`
- Positions persisted per `(knowledgeId, userId)` in localStorage
- Custom node type: `questionFlowNode` → `KQFlowNode`
- Custom edge type: `kQuestionEdge` → `KQFlowEdge`

### API endpoints (quiz/questions)
```
GET  /api/k/questions/{nodeId}             # questions for a node
GET  /api/k/questions/orphans              # orphan questions
POST /api/k/questions/{nodeId}/update      # batch add/update/delete/restore
POST /api/k/questions/{nodeId}/submit      # AI-graded session submit
POST /api/k/questions/{nodeId}/daily-submit # SRS daily review submit
GET  /api/k/questions/{nodeId}/daily-session
GET  /api/k/questions/{nodeId}/queue
GET  /api/k/questions/global-queue
GET  /api/k/retention/{knowledgeId}
GET  /api/k/retention/{knowledgeId}/graph
```

### Opening tabs
```ts
const { openKnowledgeTab, openNewKnowledgeTab } = useKTabHelper();
openNewKnowledgeTab();       // temp id < 0, opens general form
openKnowledgeTab(knowledge); // opens/updates singleton tab
```

### Context menus
- `"k-knowledge-selector"` — right-click on dropdown (add/edit/delete knowledge)
- `"k-node"` — right-click on tree node
- `"k-quiz-flow"` — right-click on canvas pane (add question, delete selected, organize)

---

## Task: $ARGUMENTS

Based on the above architecture, analyze the request and implement it following the existing patterns. Read relevant files before making changes.
