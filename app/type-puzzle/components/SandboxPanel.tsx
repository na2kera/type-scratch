'use client';

import { TypeNode, NodeId, BaseRow, TypeResultMap, NodeTypeResult } from '../lib/types';
import BaseTypeEditor from './BaseTypeEditor';
import NodeCard from './NodeCard';
import TreeDndContext from './TreeDndContext';
import RootDropZone from './RootDropZone';
import UndoControls from './UndoControls';
import CodePreview from './CodePreview';
import BlockShelf from './BlockPalette';

interface Props {
  typeResult?: TypeResultMap;
  root: TypeNode | null;
  onRootChange: (root: TypeNode | null) => void;
  baseRows: BaseRow[];
  onBaseRowsChange: (rows: BaseRow[]) => void;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  outputResult?: NodeTypeResult;
  codeSource: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function SandboxPanel({ typeResult, root, onRootChange, baseRows, onBaseRowsChange, onNodeUpdate, outputResult, codeSource, onUndo, onRedo, canUndo, canRedo }: Props) {
  const refNames = ['T'];

  return (
    <TreeDndContext root={root} onRootChange={onRootChange} typeResult={typeResult} onNodeUpdate={onNodeUpdate} refNames={refNames}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left: base type editor */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          <BaseTypeEditor rows={baseRows} onChange={onBaseRowsChange} />
        </div>

        {/* Right: canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
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
            <RootDropZone />
          )}

          {/* Output result */}
          {outputResult && (
            <div style={{
              marginTop: '16px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: `2px solid ${outputResult.errors.length > 0 ? '#fecaca' : '#bbf7d0'}`,
            }}>
              <div style={{
                background: outputResult.errors.length > 0 ? '#fee2e2' : '#dcfce7',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ fontSize: '14px' }}>{outputResult.errors.length > 0 ? '!' : '✓'}</span>
                <span style={{
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: outputResult.errors.length > 0 ? '#991b1b' : '#166534',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {outputResult.errors.length > 0 ? 'エラー' : '結果'}
                </span>
              </div>
              <div style={{
                background: '#1e293b',
                padding: '12px 14px',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: '12px',
                color: outputResult.errors.length > 0 ? '#fca5a5' : '#86efac',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6,
              }}>
                {outputResult.errors.length > 0 ? outputResult.errors[0].split('\n')[0] : outputResult.displayString}
              </div>
            </div>
          )}

          {/* Generated code preview */}
          <CodePreview source={codeSource} />
        </div>
      </div>
      <BlockShelf refNames={refNames} />
    </TreeDndContext>
  );
}
