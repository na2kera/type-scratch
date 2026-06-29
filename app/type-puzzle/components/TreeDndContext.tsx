'use client';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { TypeNode, NodeId } from '../lib/types';
import { canDrop, moveNode, deserializeSlotRef } from '../lib/tree-ops';
import NodeCard from './NodeCard';
import { getAllIds } from '../lib/nodes';

interface Props {
  root: TypeNode | null;
  children: React.ReactNode;
  onRootChange: (root: TypeNode | null) => void;
  typeResult?: Record<string, { displayString: string; errors: string[] }>;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  refNames?: string[];
}

export default function TreeDndContext({ root, children, onRootChange, typeResult, onNodeUpdate, refNames = [] }: Props) {
  const [activeId, setActiveId] = useState<NodeId | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function findNode(id: NodeId): TypeNode | null {
    if (!root) return null;
    function search(n: TypeNode): TypeNode | null {
      if (n.id === id) return n;
      switch (n.kind) {
        case 'object': for (const p of n.props) { const r = search(p.value); if (r) return r; } break;
        case 'union': for (const m of n.members) { const r = search(m); if (r) return r; } break;
        case 'tuple': for (const e of n.elements) { const r = search(e); if (r) return r; } break;
        case 'array': return search(n.element);
        case 'keyof': return search(n.target);
        case 'indexedAccess': return search(n.target) || search(n.key);
        case 'mappedType': return search(n.keys) || search(n.source);
        case 'conditional': return search(n.check) || search(n.extends) || search(n.trueBranch) || search(n.falseBranch);
        case 'templateLiteral': for (const p of n.parts) { if (typeof p !== 'string') { const r = search(p); if (r) return r; } } break;
      }
      return null;
    }
    return search(root);
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as NodeId);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const draggedId = active.id as NodeId;
    let targetSlot;
    try {
      targetSlot = deserializeSlotRef(over.id as string);
    } catch {
      return;
    }

    if (!canDrop(root, draggedId, targetSlot)) return;
    const newRoot = moveNode(root, draggedId, targetSlot);
    onRootChange(newRoot);
  }

  const activeNode = activeId ? findNode(activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {children}
      <DragOverlay>
        {activeNode && (
          <div className="opacity-80 pointer-events-none">
            <NodeCard
              node={activeNode}
              rootNode={root}
              onNodeUpdate={onNodeUpdate}
              refNames={refNames}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
