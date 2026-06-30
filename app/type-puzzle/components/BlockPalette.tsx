'use client';

import { useDraggable } from '@dnd-kit/core';
import { TypeNode, NodeKind } from '../lib/types';
import { newId } from '../lib/nodes';

interface Props {
  onSelect: (node: TypeNode) => void;
  onClose: () => void;
  inferNames?: string[];
  refNames?: string[];
}

const KIND_BG: Record<string, string> = {
  object:          '#f59e0b',
  primitive:       '#10b981',
  literal:         '#84cc16',
  union:           '#8b5cf6',
  intersection:    '#d946ef',
  tuple:           '#6366f1',
  array:           '#06b6d4',
  keyof:           '#2563eb',
  indexedAccess:   '#0d9488',
  mappedType:      '#ea580c',
  conditional:     '#ef4444',
  infer:           '#9333ea',
  templateLiteral: '#db2777',
  ref:             '#475569',
};

export const BLOCK_OPTIONS: { kind: NodeKind; label: string; desc: string }[] = [
  { kind: 'primitive',       label: 'Primitive',       desc: 'string / number / boolean' },
  { kind: 'literal',         label: 'Literal',         desc: '値リテラル' },
  { kind: 'object',          label: 'Object',          desc: '{ key: Type }' },
  { kind: 'union',           label: 'Union  |',        desc: 'A | B | ...' },
  { kind: 'intersection',    label: 'Intersection  &', desc: 'A & B & ...' },
  { kind: 'tuple',           label: 'Tuple',           desc: '[A, B, ...]' },
  { kind: 'array',           label: 'Array  T[]',      desc: 'T[]' },
  { kind: 'keyof',           label: 'keyof',           desc: 'keyof T' },
  { kind: 'indexedAccess',   label: 'T[K]',            desc: 'インデックスアクセス型' },
  { kind: 'mappedType',      label: 'Mapped Type',     desc: '{ [K in Keys]: ... }' },
  { kind: 'conditional',     label: 'Conditional',     desc: 'T extends U ? A : B' },
  { kind: 'infer',           label: 'infer',           desc: 'infer R' },
  { kind: 'templateLiteral', label: 'Template Literal', desc: '`${T}-suffix`' },
];

export function createDefaultNode(kind: NodeKind): TypeNode {
  const id = newId();
  switch (kind) {
    case 'primitive': return { id, kind: 'primitive', name: 'string' };
    case 'literal': return { id, kind: 'literal', value: 'value' };
    case 'object': return { id, kind: 'object', props: [] };
    case 'union': return { id, kind: 'union', members: [] };
    case 'intersection': return { id, kind: 'intersection', members: [] };
    case 'tuple': return { id, kind: 'tuple', elements: [] };
    case 'array': return { id, kind: 'array', element: { id: newId(), kind: 'primitive', name: 'string' } };
    case 'keyof': return { id, kind: 'keyof', target: { id: newId(), kind: 'primitive', name: 'string' } };
    case 'indexedAccess': return {
      id, kind: 'indexedAccess',
      target: { id: newId(), kind: 'primitive', name: 'string' },
      key: { id: newId(), kind: 'primitive', name: 'string' },
    };
    case 'mappedType': return {
      id, kind: 'mappedType',
      keys: { id: newId(), kind: 'primitive', name: 'string' },
      source: { id: newId(), kind: 'object', props: [] },
      transform: 'keep',
    };
    case 'conditional': return {
      id, kind: 'conditional',
      check: { id: newId(), kind: 'primitive', name: 'string' },
      extends: { id: newId(), kind: 'primitive', name: 'string' },
      trueBranch: { id: newId(), kind: 'primitive', name: 'string' },
      falseBranch: { id: newId(), kind: 'primitive', name: 'never' },
    };
    case 'infer': return { id, kind: 'infer', name: 'R' };
    case 'templateLiteral': return { id, kind: 'templateLiteral', parts: [''] };
    case 'ref': return { id, kind: 'ref', name: '' };
  }
}

interface PaletteItemProps {
  kind: NodeKind;
  label: string;
  desc: string;
  onClick: () => void;
}

function PaletteItem({ kind, label, desc, onClick }: PaletteItemProps) {
  const bg = KIND_BG[kind] ?? '#64748b';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${kind}`,
    data: { source: 'palette', kind },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '8px',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.1s, background 0.1s',
        userSelect: 'none',
      }}
      className="hover:bg-slate-50"
      {...listeners}
      {...attributes}
      onClick={onClick}
    >
      <div style={{
        width: '10px',
        height: '28px',
        borderRadius: '4px',
        background: bg,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
          {label}
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'Nunito, sans-serif', marginTop: '1px' }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

interface RefItemProps {
  dragId: string;
  label: string;
  bg: string;
  onClick: () => void;
  data: Record<string, unknown>;
}

function RefItem({ dragId, label, bg, onClick, data }: RefItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId, data });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '20px',
        background: bg,
        color: 'white',
        fontSize: '12px',
        fontFamily: 'Fira Code, monospace',
        fontWeight: 600,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        margin: '2px',
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
    >
      {label}
    </div>
  );
}

export default function BlockPalette({ onSelect, onClose, inferNames = [], refNames = [] }: Props) {
  return (
    <div style={{
      position: 'absolute',
      zIndex: 50,
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '12px',
      minWidth: '240px',
      maxHeight: '420px',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', fontFamily: 'Nunito, sans-serif' }}>ブロックを選ぶ</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      {(refNames.length > 0 || inferNames.length > 0) && (
        <div style={{ marginBottom: '10px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'Nunito, sans-serif' }}>
            参照
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {refNames.map(name => (
              <RefItem
                key={`ref-${name}`}
                dragId={`palette:ref:${name}`}
                label={name}
                bg="#475569"
                data={{ source: 'palette', kind: 'ref', name }}
                onClick={() => { onSelect({ id: newId(), kind: 'ref', name }); onClose(); }}
              />
            ))}
            {inferNames.map(name => (
              <RefItem
                key={`infer-${name}`}
                dragId={`palette:infer:${name}`}
                label={`infer ${name}`}
                bg="#9333ea"
                data={{ source: 'palette', kind: 'infer', name }}
                onClick={() => { onSelect({ id: newId(), kind: 'infer', name }); onClose(); }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingLeft: '10px', fontFamily: 'Nunito, sans-serif' }}>
        ブロック
      </div>
      {BLOCK_OPTIONS.map(opt => (
        <PaletteItem
          key={opt.kind}
          kind={opt.kind}
          label={opt.label}
          desc={opt.desc}
          onClick={() => { onSelect(createDefaultNode(opt.kind)); onClose(); }}
        />
      ))}
    </div>
  );
}
