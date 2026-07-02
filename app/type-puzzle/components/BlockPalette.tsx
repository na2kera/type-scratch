'use client';

import { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TypeNode, NodeKind } from '../lib/types';
import { newId } from '../lib/nodes';

interface Props {
  inferNames?: string[];
  refNames?: string[];
}

const EXPANDED_SPACER = 282;
const COLLAPSED_SPACER = 50;
const DRAG_THRESHOLD = 48;

function useShelfDrag(collapsed: boolean, setCollapsed: (v: boolean) => void) {
  const [dragY, setDragY] = useState(0);
  const startRef = useRef<{ y: number; collapsed: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startRef.current = { y: e.clientY, collapsed };
    setDragY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const delta = e.clientY - startRef.current.y;
    if (startRef.current.collapsed) {
      setDragY(Math.min(0, delta));
    } else {
      setDragY(Math.max(0, delta));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!startRef.current) return;
    const delta = e.clientY - startRef.current.y;
    if (startRef.current.collapsed) {
      if (delta < -DRAG_THRESHOLD) setCollapsed(false);
    } else if (delta > DRAG_THRESHOLD) {
      setCollapsed(true);
    }
    startRef.current = null;
    setDragY(0);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onPointerCancel(e: React.PointerEvent) {
    startRef.current = null;
    setDragY(0);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return { dragY, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}

function ShelfDragHandle({ handlers }: {
  handlers: ReturnType<typeof useShelfDrag>;
}) {
  return (
    <div
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 0 12px',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{
        width: '40px',
        height: '5px',
        borderRadius: '999px',
        background: '#cbd5e1',
      }} />
    </div>
  );
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
      className="block-palette-item hover:-translate-y-0.5 hover:shadow-md"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '18px 16px',
        borderRadius: '12px',
        background: 'white',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(15,23,42,0.06)',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.1s, transform 0.1s, box-shadow 0.1s',
        userSelect: 'none',
        flex: '0 0 auto',
        minWidth: 'min(160px, calc(100vw - 56px))',
        minHeight: '87px',
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
    >
      <div style={{
        width: '10px',
        height: '60px',
        borderRadius: '4px',
        background: bg,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontFamily: 'Menlo, var(--font-geist-mono), ui-monospace, monospace', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', marginTop: '3px' }}>
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
        padding: '12px 18px',
        borderRadius: '20px',
        background: bg,
        color: 'white',
        fontSize: '14px',
        fontFamily: 'Menlo, var(--font-geist-mono), ui-monospace, monospace',
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
  const shelfDrag = useShelfDrag(collapsed, setCollapsed);
  const spacerHeight = collapsed ? `${COLLAPSED_SPACER}px` : `${EXPANDED_SPACER}px`;

  return (
    <>
      <div style={{ height: spacerHeight, transition: shelfDrag.dragY === 0 ? 'height 0.2s ease' : 'none' }} />
      <div className="block-shelf-panel" style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: 'rgba(248,250,252,0.96)',
        borderTop: '1.5px solid #cbd5e1',
        boxShadow: '0 -8px 28px rgba(15,23,42,0.12)',
        backdropFilter: 'blur(10px)',
        padding: collapsed ? '0 clamp(12px, 4vw, 20px) 10px' : '0 clamp(12px, 4vw, 20px) 24px',
        transform: shelfDrag.dragY !== 0 ? `translateY(${shelfDrag.dragY}px)` : undefined,
        transition: shelfDrag.dragY === 0 ? 'transform 0.2s ease' : 'none',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <ShelfDragHandle handlers={shelfDrag} />
          {collapsed ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 12px 6px',
              borderRadius: '10px',
              border: '1.5px dashed #cbd5e1',
              background: 'white',
              color: '#64748b',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: '12px',
              fontWeight: 800,
            }}>
              ブロック棚
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                  ブロック棚
                </span>
                <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '11px', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  下からドラッグして、空いている場所に置きます
                </span>
              </div>

              <div className="block-shelf-list" style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: '12px',
                overflowX: 'auto',
                overflowY: 'hidden',
                minHeight: '87px',
                paddingBottom: '6px',
                WebkitOverflowScrolling: 'touch',
              }}>
                {(refNames.length > 0 || inferNames.length > 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: '#e2e8f0',
                    borderRadius: '12px',
                    minHeight: '87px',
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
