'use client';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { TypeNode, NodeId, NodeKind, SlotRef } from '../lib/types';
import { canDrop, moveNode, placeNode, deserializeSlotRef } from '../lib/tree-ops';
import { newId } from '../lib/nodes';
import NodeCard from './NodeCard';
import { createDefaultNode, BLOCK_OPTIONS } from './BlockPalette';
import { DragStateContext, DropValidity } from './DragStateContext';

interface Props {
  root: TypeNode | null;
  children: React.ReactNode;
  onRootChange: (root: TypeNode | null) => void;
  typeResult?: Record<string, { displayString: string; errors: string[] }>;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  refNames?: string[];
}

type ActiveState =
  | { source: 'tree'; id: NodeId }
  | { source: 'palette'; kind: NodeKind; label: string }
  | { source: 'palette-ref'; name: string; variant: 'ref' | 'infer' }
  | null;

export default function TreeDndContext({ root, children, onRootChange, typeResult, onNodeUpdate, refNames = [] }: Props) {
  const [active, setActive] = useState<ActiveState>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

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
    const id = e.active.id as string;
    const data = e.active.data.current;

    if (data?.source === 'palette') {
      if (data.kind === 'ref') {
        setActive({ source: 'palette-ref', name: data.name as string, variant: 'ref' });
      } else if (data.kind === 'infer') {
        setActive({ source: 'palette-ref', name: data.name as string, variant: 'infer' });
      } else {
        const opt = BLOCK_OPTIONS.find(o => o.kind === data.kind);
        setActive({ source: 'palette', kind: data.kind as NodeKind, label: opt?.label ?? String(data.kind) });
      }
    } else {
      setActive({ source: 'tree', id });
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const prevActive = active;
    setActive(null);
    const { over } = e;
    if (!over || !prevActive) return;

    let targetSlot;
    try {
      targetSlot = deserializeSlotRef(over.id as string);
    } catch {
      return;
    }

    if (prevActive.source === 'tree') {
      const draggedId = prevActive.id;
      if (!canDrop(root, draggedId, targetSlot)) return;
      onRootChange(moveNode(root, draggedId, targetSlot));
      return;
    }

    // palette drop — create a new node
    let newNode: TypeNode;
    if (prevActive.source === 'palette-ref') {
      newNode = prevActive.variant === 'ref'
        ? { id: newId(), kind: 'ref', name: prevActive.name }
        : { id: newId(), kind: 'infer', name: prevActive.name };
    } else {
      newNode = createDefaultNode(prevActive.kind);
    }

    onRootChange(placeNode(root, targetSlot, newNode));
  }

  const activeTreeNode = active?.source === 'tree' ? findNode(active.id) : null;

  const dragContextValue = useMemo(() => ({
    isDragging: active !== null,
    checkValidity: (slotRef: SlotRef, hasNode: boolean): DropValidity => {
      if (!active) return 'inactive';
      if (active.source === 'tree') {
        const valid = canDrop(root, active.id, slotRef);
        if (!valid) return 'invalid';
        return hasNode ? 'valid-swap' : 'valid-empty';
      }
      // palette drop — always valid, replaces existing
      return hasNode ? 'valid-swap' : 'valid-empty';
    },
  }), [active, root]);

  return (
    <DragStateContext.Provider value={dragContextValue}>
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>
        {active?.source === 'tree' && activeTreeNode && (
          <div className="opacity-80 pointer-events-none">
            <NodeCard
              node={activeTreeNode}
              rootNode={root}
              onNodeUpdate={onNodeUpdate}
              refNames={refNames}
            />
          </div>
        )}
        {active?.source === 'palette' && (
          <div className="bg-white border border-blue-300 rounded-lg px-3 py-1.5 shadow-lg text-sm font-mono text-blue-600 pointer-events-none">
            {active.label}
          </div>
        )}
        {active?.source === 'palette-ref' && (
          <div className={`border rounded-lg px-3 py-1.5 shadow-lg text-sm font-mono pointer-events-none ${active.variant === 'infer' ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-blue-50 border-blue-300 text-blue-700'}`}>
            {active.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
    </DragStateContext.Provider>
  );
}
