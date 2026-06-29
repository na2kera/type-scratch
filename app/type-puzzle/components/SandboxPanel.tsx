'use client';

import { useState, useCallback } from 'react';
import { TypeNode, NodeId, BaseRow } from '../lib/types';
import { newId } from '../lib/nodes';
import { serializeSlotRef } from '../lib/tree-ops';
import BaseTypeEditor from './BaseTypeEditor';
import NodeCard from './NodeCard';
import TreeDndContext from './TreeDndContext';
import BlockPalette from './BlockPalette';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  typeResult?: Record<string, { displayString: string; errors: string[] }>;
  root: TypeNode | null;
  onRootChange: (root: TypeNode | null) => void;
  baseRows: BaseRow[];
  onBaseRowsChange: (rows: BaseRow[]) => void;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  outputResult?: { displayString: string; errors: string[] };
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function RootDropZone({ onSet, refNames }: { onSet: (n: TypeNode) => void; refNames: string[] }) {
  const [showPalette, setShowPalette] = useState(false);
  const slotId = serializeSlotRef({ kind: 'root' });
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div ref={setNodeRef} className={`relative flex items-center justify-center h-24 border-2 border-dashed rounded-xl transition-colors ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
      <div className="relative">
        <button
          onClick={() => setShowPalette(s => !s)}
          className="px-4 py-2 text-sm text-gray-400 hover:text-blue-500"
        >
          + ルートブロックを選ぶ
        </button>
        {showPalette && (
          <BlockPalette
            onSelect={onSet}
            onClose={() => setShowPalette(false)}
            refNames={refNames}
          />
        )}
      </div>
    </div>
  );
}

function updateNodeInTree(root: TypeNode | null, id: NodeId, updater: (node: TypeNode) => TypeNode): TypeNode | null {
  if (!root) return null;
  if (root.id === id) return updater(root);

  function update(node: TypeNode): TypeNode {
    if (node.id === id) return updater(node);
    switch (node.kind) {
      case 'object': return { ...node, props: node.props.map(p => ({ ...p, value: update(p.value) })) };
      case 'union': return { ...node, members: node.members.map(update) };
      case 'tuple': return { ...node, elements: node.elements.map(update) };
      case 'array': return { ...node, element: update(node.element) };
      case 'keyof': return { ...node, target: update(node.target) };
      case 'indexedAccess': return { ...node, target: update(node.target), key: update(node.key) };
      case 'mappedType': return { ...node, keys: update(node.keys), source: update(node.source) };
      case 'conditional': return { ...node, check: update(node.check), extends: update(node.extends), trueBranch: update(node.trueBranch), falseBranch: update(node.falseBranch) };
      case 'templateLiteral': return { ...node, parts: node.parts.map(p => typeof p === 'string' ? p : update(p)) };
    }
    return node;
  }

  return update(root);
}

export default function SandboxPanel({ typeResult, root, onRootChange, baseRows, onBaseRowsChange, onNodeUpdate, outputResult, onUndo, onRedo, canUndo, canRedo }: Props) {
  const refNames = ['T'];

  return (
    <div className="flex gap-4">
      <div className="w-72 shrink-0">
        <BaseTypeEditor rows={baseRows} onChange={onBaseRowsChange} />
      </div>
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">型ツリー</div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="元に戻す (Ctrl+Z)"
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↩ Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="やり直す (Ctrl+Shift+Z)"
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↪ Redo
            </button>
            {root && (
              <button
                onClick={() => onRootChange(null)}
                className="text-xs text-gray-400 hover:text-red-400"
              >
                全リセット
              </button>
            )}
          </div>
        </div>
        <TreeDndContext root={root} onRootChange={onRootChange} typeResult={typeResult} onNodeUpdate={onNodeUpdate} refNames={refNames}>
          {root ? (
            <NodeCard
              node={root}
              rootNode={root}
              onRemove={() => onRootChange(null)}
              refNames={refNames}
              typeResult={typeResult}
              onNodeUpdate={onNodeUpdate}
              isRoot
            />
          ) : (
            <RootDropZone onSet={onRootChange} refNames={refNames} />
          )}
        </TreeDndContext>
        {outputResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-mono ${outputResult.errors.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            <div className="text-xs text-gray-500 mb-1">結果:</div>
            {outputResult.errors.length > 0 ? outputResult.errors[0] : outputResult.displayString}
          </div>
        )}
      </div>
    </div>
  );
}
