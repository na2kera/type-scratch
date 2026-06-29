'use client';

import { useState } from 'react';
import { TypeNode, NodeId, Puzzle } from '../lib/types';
import { serializeSlotRef } from '../lib/tree-ops';
import { puzzles } from '../lib/puzzles';
import NodeCard from './NodeCard';
import TreeDndContext from './TreeDndContext';
import BlockPalette from './BlockPalette';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  typeResult?: Record<string, { displayString: string; errors: string[] }>;
  root: TypeNode | null;
  onRootChange: (root: TypeNode | null) => void;
  currentPuzzleId: string;
  onPuzzleChange: (id: string) => void;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  onJudge: () => Promise<boolean>;
  judgeResult: boolean | null;
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

export default function PuzzlePanel({ typeResult, root, onRootChange, currentPuzzleId, onPuzzleChange, onNodeUpdate, onJudge, judgeResult, onUndo, onRedo, canUndo, canRedo }: Props) {
  const [judging, setJudging] = useState(false);
  const puzzle = puzzles.find(p => p.id === currentPuzzleId) ?? puzzles[0];
  const refNames = ['User'];

  async function handleJudge() {
    setJudging(true);
    await onJudge();
    setJudging(false);
  }

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {puzzles.map(p => (
          <button
            key={p.id}
            onClick={() => onPuzzleChange(p.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${p.id === currentPuzzleId ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* 問題文 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-700 mb-2">{puzzle.description}</div>
        <div className="font-mono text-sm bg-white rounded p-2 border border-blue-200 text-blue-800">
          {puzzle.targetCodeDisplay}
        </div>
        <div className="text-xs text-gray-400 mt-2 font-mono">{puzzle.baseTypeSource}</div>
      </div>

      {/* ツリー */}
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
          <button onClick={() => onRootChange(null)} className="text-xs text-gray-400 hover:text-red-400">全リセット</button>
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

      {/* 判定 */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleJudge}
          disabled={!root || judging}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {judging ? '判定中...' : '判定する'}
        </button>
        {judgeResult !== null && (
          <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${judgeResult ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            {judgeResult ? '正解!' : '不正解...もう一度試してみてください'}
          </div>
        )}
      </div>
    </div>
  );
}
