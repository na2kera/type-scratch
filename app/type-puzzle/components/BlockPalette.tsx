'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TypeNode, NodeKind } from '../lib/types';
import { newId } from '../lib/nodes';

interface Props {
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
}

function PaletteItem({ kind, label, desc }: PaletteItemProps) {
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
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'white',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(15,23,42,0.06)',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.1s, transform 0.1s, box-shadow 0.1s',
        userSelect: 'none',
        flex: '0 0 auto',
        minWidth: '160px',
        minHeight: '58px',
        touchAction: 'none',
      }}
      className="hover:-translate-y-0.5 hover:shadow-md"
      {...listeners}
      {...attributes}
    >
      <div style={{
        width: '10px',
        height: '40px',
        borderRadius: '4px',
        background: bg,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
          {label}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', marginTop: '2px' }}>
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
  data: Record<string, unknown>;
}

function RefItem({ dragId, label, bg, data }: RefItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId, data });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 14px',
        borderRadius: '20px',
        background: bg,
        color: 'white',
        fontSize: '13px',
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontWeight: 600,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        flex: '0 0 auto',
        boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
    >
      {label}
    </div>
  );
}

export default function BlockShelf({ inferNames = [], refNames = [] }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const spacerHeight = collapsed ? '46px' : '188px';

  return (
    <>
      <div style={{ height: spacerHeight }} />
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: 'rgba(248,250,252,0.96)',
        borderTop: '1.5px solid #cbd5e1',
        boxShadow: '0 -8px 28px rgba(15,23,42,0.12)',
        backdropFilter: 'blur(10px)',
        padding: collapsed ? '10px 20px' : '14px 20px 16px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1.5px dashed #cbd5e1',
                background: 'white',
                color: '#64748b',
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ↑ ブロック棚を開く
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                    ブロック棚
                  </span>
                  <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '11px', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    下からドラッグして、空いている場所に置きます
                  </span>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: '1.5px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ↓ しまう
                </button>
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: '10px',
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: '4px',
                WebkitOverflowScrolling: 'touch',
              }}>
                {(refNames.length > 0 || inferNames.length > 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#e2e8f0',
                    borderRadius: '12px',
                    flex: '0 0 auto',
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
                      参照
                    </span>
                    {refNames.map(name => (
                      <RefItem
                        key={`ref-${name}`}
                        dragId={`palette:ref:${name}`}
                        label={name}
                        bg="#475569"
                        data={{ source: 'palette', kind: 'ref', name }}
                      />
                    ))}
                    {inferNames.map(name => (
                      <RefItem
                        key={`infer-${name}`}
                        dragId={`palette:infer:${name}`}
                        label={`infer ${name}`}
                        bg="#9333ea"
                        data={{ source: 'palette', kind: 'infer', name }}
                      />
                    ))}
                  </div>
                )}

                {BLOCK_OPTIONS.map(opt => (
                  <PaletteItem
                    key={opt.kind}
                    kind={opt.kind}
                    label={opt.label}
                    desc={opt.desc}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
