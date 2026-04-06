# Task Context: k.question restructure — tách question ra khỏi k.node

## Mục tiêu
Tạo bảng `k.question` riêng, bỏ `nodeType` khỏi `k.node`. Quan hệ mới: `k.node → k.test → k.question`.

## Trước (current)
```
k.node (id, parent_id, node_type="entity"|"question", name, description, icon, color, ...)
k.test (id, knowledge_id, node_id, title, ...)
k.test_node (id, test_id, node_id, is_active)  ← junction table nối test ↔ question node
k.point_history (id, test_id, node_id, point, answer_text, ...)
```
- Question là một loại node (`node_type="question"`) nằm trong k.node
- KTree phải filter question ra khỏi tree
- KDialog phải disable icon picker cho question
- Kanban phải join `currentK.flatData` để lấy question data
- Concept "orphan question" = question node chưa assign vào test nào

## Sau (target)
```
k.node (id, parent_id, name, description, icon, color, ...)  ← CHỈ entity/keyword
k.test (id, knowledge_id, node_id, title, ...)
k.question (id, test_id, name, description, is_active, sort_order, ...)  ← MỚI, thuộc test
k.point_history (id, test_id, question_id, point, answer_text, ...)  ← đổi node_id → question_id
```
- `k.test_node` bị DROP (thay bằng k.question)
- `k.node.node_type` bị DROP
- Question thuộc trực tiếp về test, KHÔNG reference k.node
- Không còn concept orphan — question luôn thuộc về 1 test
- KTree không cần filter — k.node chỉ có entity
- KDialog không cần check nodeType — mọi node đều là entity

## Frontend type changes

### KTestQuestion (before)
```typescript
interface KTestQuestion {
    testNodeId: number;    // k.test_node.id
    nodeId: number;        // k.node.id (question node)
    question: string;      // from k.node.name
    answer: string | null; // from k.node.description
    isActive: boolean;
    scoreHistory: number[];
}
```

### KTestQuestion (after)
```typescript
interface KTestQuestion {
    id: number;            // k.question.id
    question: string;      // k.question.name (self-contained)
    answer: string | null; // k.question.description
    isActive: boolean;
    sortOrder: number;
    scoreHistory: number[];
}
```

### KUpdateTestNodesRequest → KUpdateQuestionsRequest
```typescript
// Before
interface KUpdateTestNodesRequest {
    addNodeIds: number[];
    toggleTestNodeIds: number[];
    deleteTestNodeIds: number[];
}

// After
interface KUpdateQuestionsRequest {
    addQuestions: Array<{ name: string; description?: string | null }>;
    toggleQuestionIds: number[];
    deleteQuestionIds: number[];
}
```

### KItemV2 — remove nodeType
```typescript
// Before: nodeType?: "entity" | "question" | null;
// After: field removed entirely
```

## Files affected (16 files)

### Database (6 files)
- `k/Tables/question.sql` — NEW table
- `k/Tables/alter_create_question.sql` — migration script
- `k/Tables/alter_point_history_question_id.sql` — migration: node_id → question_id
- `k/Tables/alter_node_drop_type.sql` — migration: drop node_type column
- `k/Tables/node.sql` — update CREATE TABLE definition
- `k/Tables/point_history.sql` — update CREATE TABLE definition

### Frontend types (2 files)
- `src/Components/K/types/kTest.type.ts`
- `src/Components/K/types/K-v2.types.ts`

### Frontend service + hooks (3 files)
- `src/Components/K/service/kTest.service.ts`
- `src/Components/K/hooks/useKTest.loader.ts`
- `src/Components/K/hooks/useKNodeEditor.loader.ts`

### Frontend UI (5 files)
- `src/Components/K/Components/KTestKanbanView/KTestKanbanView.tsx` — major rewrite
- `src/Components/K/Components/KTestDetail/KTestDetail.tsx` — simplify
- `src/Components/K/Components/KTestSession/KTestSession.tsx` — minor: nodeId → questionId
- `src/Components/K/Components/KKnowledgeEditorPanel.tsx` — remove nodeMap
- `src/Components/K/Components/KExplorer/KNode.tsx` — remove isQuestion
- `src/Components/K/Components/KExplorer/KTree.tsx` — remove filteredK
- `src/Components/K/Components/KExplorer/KDialog/KDialog.tsx` — remove nodeType logic

## Key decisions
1. `k.question` replaces `k.test_node` entirely (DROP test_node)
2. `k.point_history` uses `question_id` instead of `node_id`
3. Questions only created from test/kanban UI (not from tree/dialog)
4. No more "orphan question" concept
5. No more auto-detect "?" for nodeType
6. `ON DELETE CASCADE` from k.test → k.question (delete test = delete its questions)
