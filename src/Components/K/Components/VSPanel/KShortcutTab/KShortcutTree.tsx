/**
 * KShortcutTree — react-arborist tree để chọn target nodes khi tạo shortcut.
 *
 * Data:   KShortcutDialogStore.targetTree
 * Height: prop từ KShortcutTab (ResizeObserver)
 * Node:   KShortcutNode (multi-select checkbox, no drag/drop)
 */

import React, { useCallback, useMemo } from "react";
import { Tree } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import { KtreeMiniHelper, KTreeNode } from "../../../hooks/Ktree.miniHelper";
import { useKShortcutDialogStore } from "../../../store/KShortcutDialog.store";
import { KShortcutNode } from "./KShortcutNode";
import type { KItemV2 } from "../../../types/K-v2.types";

interface KShortcutTreeProps {
    height: number;
}

export function KShortcutTree({ height }: KShortcutTreeProps) {
    const { targetTree, selectedNodes, setSelectedNodes } = useKShortcutDialogStore();
    const manager = useDragDropManager();

    const treeData = useMemo(
        () => KtreeMiniHelper.transformToTreeData(targetTree ?? null, ""),
        [targetTree],
    );

    // Toggle: nếu đã có trong array → remove, chưa có → add
    // QUAN TRỌNG: nếu item là shortcut → resolve về node gốc (refTargetId)
    // Không bao giờ tạo shortcut-of-shortcut
    const handleToggle = useCallback((item: KItemV2) => {
        // Resolve: nếu là shortcut thì lấy node gốc từ targetTree.flatData
        const resolvedItem: KItemV2 = (() => {
            if (item.typeCode !== "shortcut") return item;

            // Phải có refTargetId và refTargetKnowledgeId
            if (!item.refTargetId || !item.refTargetKnowledgeId) {
                console.warn("⚠️ Shortcut thiếu refTargetId / refTargetKnowledgeId, bỏ qua");
                return item;
            }

            // Tìm node gốc trong flatData của targetTree
            const origin = targetTree?.flatData.find((n) => n.id === item.refTargetId);
            if (!origin) {
                // Node gốc không tồn tại trong tree này (khác knowledge) → dùng synthetic item
                // với id = refTargetId để helper tạo shortcut đúng
                return {
                    ...item,
                    id:          item.refTargetId,
                    knowledgeId: item.refTargetKnowledgeId,
                    typeCode:    "draft", // resolved → không còn là shortcut nữa
                    refTargetId: null,
                    refTargetKnowledgeId: null,
                } satisfies KItemV2;
            }

            // Node gốc tìm thấy — nếu gốc lại là shortcut thì đệ quy không thể xảy ra
            // vì server đã resolve tại query time, nhưng guard thêm cho chắc:
            if (origin.typeCode === "shortcut") {
                console.warn("⚠️ Node gốc vẫn còn là shortcut sau khi resolve — data không hợp lệ");
                return item;
            }

            return origin;
        })();

        setSelectedNodes((prev) =>
            prev.some((n) => n.id === resolvedItem.id)
                ? prev.filter((n) => n.id !== resolvedItem.id)
                : [...prev, resolvedItem],
        );
    }, [setSelectedNodes, targetTree]);

    return (
        <div className="h-full pl-4 py-2">
            <Tree<KTreeNode>
                data={treeData}
                openByDefault={true}
                width="100%"
                height={height}
                indent={24}
                rowHeight={32}
                overscanCount={10}
                dndManager={manager}
                disableDrag={true}
                disableDrop={true}
                disableMultiSelection={true}
                disableEdit={true}
                renderDragPreview={() => null}
            >
                {({ node, style }) => (
                    <KShortcutNode
                        node={node}
                        style={style}
                        selectedNodes={selectedNodes}
                        onToggle={handleToggle}
                    />
                )}
            </Tree>
        </div>
    );
}
