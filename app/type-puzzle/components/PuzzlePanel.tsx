'use client';

import { useState } from 'react';
import { TypeNode, NodeId, TypeResultMap } from '../lib/types';
import { puzzles } from '../lib/puzzles';
import NodeCard from './NodeCard';
import TreeDndContext from './TreeDndContext';
import RootDropZone from './RootDropZone';
import UndoControls from './UndoControls';

interface Props {
  typeResult?: TypeResultMap;
  root: TypeNode | null;
  onRootChange: (root: TypeNode | null) => void;
  currentPuzzleId: string;
  onPuzzleChange: (id: string) => void;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  onJudge: () => Promise<boolean>;
  judgeResult: boolean | null;
  solved: Set<string>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function PuzzlePanel({ typeResult, root, onRootChange, currentPuzzleId, onPuzzleChange, onNodeUpdate, onJudge, judgeResult, solved, onUndo, onRedo, canUndo, canRedo }: Props) {
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
      {/* Puzzle tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {puzzles.map((p, idx) => {
          const isCurrent = p.id === currentPuzzleId;
          const isSolved = solved.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onPuzzleChange(p.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '10px',
                border: `2px solid ${isCurrent ? '#2563eb' : '#e2e8f0'}`,
                background: isCurrent ? '#2563eb' : 'white',
                color: isCurrent ? 'white' : '#475569',
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: isCurrent ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: isCurrent ? 'white' : '#94a3b8',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              {p.title}
              {isSolved && (
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Problem description */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1.5px solid #e2e8f0',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          background: '#2563eb',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>🎯</span>
          <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            問題
          </span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '13px', color: '#334155', lineHeight: 1.6, marginBottom: '10px' }}>
            {puzzle.description}
          </p>
          <div style={{
            background: '#1e293b',
            borderRadius: '10px',
            padding: '12px 16px',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '13px',
            color: '#67e8f9',
            fontWeight: 600,
          }}>
            {puzzle.targetCodeDisplay}
          </div>
          <div style={{
            marginTop: '8px',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '11px',
            color: '#94a3b8',
          }}>
            {puzzle.baseTypeSource}
          </div>
        </div>
      </div>

      {/* Tree area */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ブロックツリー
        </span>
        <UndoControls
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onReset={() => onRootChange(null)}
          hasRoot={!!root}
        />
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

      {/* Judge section */}
      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleJudge}
          disabled={!root || judging}
          style={{
            padding: '10px 28px',
            borderRadius: '12px',
            border: 'none',
            background: !root || judging ? '#e2e8f0' : '#2563eb',
            color: !root || judging ? '#94a3b8' : 'white',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: 800,
            cursor: !root || judging ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            boxShadow: !root || judging ? 'none' : '0 4px 12px rgba(37,99,235,0.35)',
          }}
        >
          {judging ? '⏳ 判定中...' : '✓ 判定する'}
        </button>

        {judgeResult !== null && (
          <div style={{
            padding: '10px 20px',
            borderRadius: '12px',
            background: judgeResult ? '#dcfce7' : '#fee2e2',
            border: `2px solid ${judgeResult ? '#86efac' : '#fca5a5'}`,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: 800,
            color: judgeResult ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>{judgeResult ? '🎉' : '😅'}</span>
            {judgeResult ? '正解！' : 'もう一度試してみてください'}
          </div>
        )}
      </div>
    </div>
  );
}
