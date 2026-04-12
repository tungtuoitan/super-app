/**
 * Module-level drag state shared between KNode (writer) and KTestDetail (reader).
 * Lives OUTSIDE React to avoid re-renders during drag that break react-arborist.
 */
let _dragNodeIds: number[] = [];

export const kTestDrag = {
    set(ids: number[]) { _dragNodeIds = ids; },
    get()              { return _dragNodeIds; },
    clear()            { _dragNodeIds = []; },
};

/** react-dnd type for dragging a kanban test column onto a tree node */
export const KANBAN_TEST_TO_TREE = "kanban-test-to-tree";

export interface KanbanTestToTreeItem {
    testId: number;
    knowledgeId: number;
    title: string;
    sourceNodeId: number;
}
