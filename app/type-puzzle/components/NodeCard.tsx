'use client';

import { useState, useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { TypeNode, NodeId, SlotRef, TypeResultMap } from '../lib/types';
import { newId, collectInferNamesInExtends } from '../lib/nodes';
import { serializeSlotRef } from '../lib/tree-ops';
import BlockPalette from './BlockPalette';
import { useDragState } from './DragStateContext';

// Scratch-style block colors — one strong color per type
const KIND_CONFIG: Record<string, { bg: string; label: string }> = {
  object:          { bg: '#f59e0b', label: 'Object' },
  primitive:       { bg: '#10b981', label: 'Primitive' },
  literal:         { bg: '#84cc16', label: 'Literal' },
  union:           { bg: '#8b5cf6', label: 'Union  |' },
  intersection:    { bg: '#d946ef', label: 'Intersection  &' },
  tuple:           { bg: '#6366f1', label: 'Tuple' },
  array:           { bg: '#06b6d4', label: 'Array  T[]' },
  keyof:           { bg: '#2563eb', label: 'keyof' },
  indexedAccess:   { bg: '#0d9488', label: 'T[K]' },
  mappedType:      { bg: '#ea580c', label: 'Mapped Type' },
  conditional:     { bg: '#ef4444', label: 'Conditional' },
  infer:           { bg: '#9333ea', label: 'infer' },
  templateLiteral: { bg: '#db2777', label: 'Template Literal' },
  ref:             { bg: '#475569', label: 'ref' },
};

// Shared style helpers for Scratch-like inputs inside colored blocks
const scratchInput: React.CSSProperties = {
  background: 'white',
  color: '#1e293b',
  border: 'none',
  borderRadius: '6px',
  padding: '2px 8px',
  fontSize: '12px',
  fontFamily: 'Fira Code, monospace',
  fontWeight: 500,
  outline: 'none',
  minWidth: 0,
};

const scratchSelect: React.CSSProperties = {
  ...scratchInput,
  padding: '2px 6px',
  cursor: 'pointer',
};

const scratchLabel: React.CSSProperties = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'Nunito, sans-serif',
  flexShrink: 0,
};

interface SlotProps {
  slotRef: SlotRef;
  node: TypeNode | null;
  label?: string;
  onSet: (node: TypeNode) => void;
  onRemove?: () => void;
  rootNode: TypeNode | null;
  inferNames?: string[];
  refNames?: string[];
  insideExtends?: boolean;
  typeResult?: TypeResultMap;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
}

function Slot({ slotRef, node, label, onSet, onRemove, rootNode, inferNames = [], refNames = [], insideExtends = false, typeResult, onNodeUpdate }: SlotProps) {
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const slotId = serializeSlotRef(slotRef);

  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: slotId });
  const { isDragging, checkValidity } = useDragState();
  const validity = isDragging ? checkValidity(slotRef, !!node) : 'inactive';

  if (node) {
    const dropBorderStyle: React.CSSProperties = (() => {
      if (!isDragging) return {};
      if (isOver && validity === 'valid-swap') return { outline: '2px solid #fbbf24', outlineOffset: '1px', borderRadius: '10px' };
      if (isOver && validity === 'invalid') return { outline: '2px solid #ef4444', outlineOffset: '1px', borderRadius: '10px' };
      return {};
    })();

    return (
      <div ref={setDropRef} style={{ position: 'relative', ...dropBorderStyle }}>
        {isOver && validity === 'valid-swap' && (
          <div style={{ position: 'absolute', top: '-18px', left: 0, zIndex: 20, fontSize: '10px', color: '#fbbf24', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap', fontWeight: 700 }}>
            ↔ 入れ替え
          </div>
        )}
        {label && <span style={scratchLabel} className="mr-1">{label}</span>}
        <NodeCard
          node={node}
          rootNode={rootNode}
          onRemove={onRemove}
          inferNames={inferNames}
          refNames={refNames}
          insideExtends={insideExtends}
          typeResult={typeResult}
          onNodeUpdate={onNodeUpdate}
          onSet={onSet}
        />
      </div>
    );
  }

  const emptyStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      padding: '3px 10px',
      fontSize: '11px',
      fontWeight: 700,
      fontFamily: 'Nunito, sans-serif',
      borderRadius: '6px',
      border: '2px dashed',
      cursor: 'pointer',
      transition: 'all 0.1s',
    };
    if (isOver && validity === 'valid-empty') {
      return { ...base, background: 'rgba(255,255,255,0.4)', borderColor: 'white', color: 'white' };
    }
    if (isDragging && (validity === 'valid-empty' || validity === 'valid-swap')) {
      return { ...base, background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)', color: 'rgba(255,255,255,0.8)' };
    }
    return { ...base, background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.7)' };
  })();

  return (
    <div ref={setDropRef} style={{ display: 'inline-block' }}>
      {label && <span style={scratchLabel} className="mr-1">{label}</span>}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button onClick={() => setShowPalette(s => !s)} style={emptyStyle}>
          {isOver && validity === 'valid-empty' ? 'ここにドロップ' : '+ ブロックを選ぶ'}
        </button>
        {showPalette && (
          <div ref={paletteRef}>
            <BlockPalette
              onSelect={onSet}
              onClose={() => setShowPalette(false)}
              inferNames={inferNames}
              refNames={refNames}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface NodeCardProps {
  node: TypeNode;
  rootNode: TypeNode | null;
  onRemove?: () => void;
  inferNames?: string[];
  refNames?: string[];
  insideExtends?: boolean;
  typeResult?: TypeResultMap;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  onSet?: (node: TypeNode) => void;
  isRoot?: boolean;
}

export default function NodeCard({ node, rootNode, onRemove, inferNames = [], refNames = [], insideExtends = false, typeResult, onNodeUpdate, onSet, isRoot = false }: NodeCardProps) {
  const config = KIND_CONFIG[node.kind] ?? { bg: '#64748b', label: node.kind };
  const result = typeResult?.[node.id];

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    disabled: isRoot,
  });

  function makeSlotProps(slotRef: SlotRef, child: TypeNode | null, label?: string, removeChild?: () => void, opts?: { insideExtends?: boolean; inferNamesOverride?: string[] }): SlotProps {
    return {
      slotRef,
      node: child,
      label,
      onSet: (n) => onNodeUpdate(node.id, (cur) => setSlot(cur, slotRef, n)),
      onRemove: removeChild,
      rootNode,
      inferNames: opts?.inferNamesOverride ?? inferNames,
      refNames,
      insideExtends: opts?.insideExtends ?? insideExtends,
      typeResult,
      onNodeUpdate,
    };
  }

  function setSlot(cur: TypeNode, slotRef: SlotRef, newNode: TypeNode): TypeNode {
    if (slotRef.kind === 'single') {
      return { ...cur, [slotRef.slot]: newNode } as TypeNode;
    }
    return cur;
  }

  // Drag/delete button styles (white icons on colored bg)
  const iconBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer',
    padding: '0 4px',
    fontSize: '14px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
    transition: 'color 0.1s',
  };

  function renderContent() {
    switch (node.kind) {
      case 'primitive':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={node.name}
              onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, name: e.target.value } as TypeNode))}
              style={scratchSelect}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="never">never</option>
              <option value="any">any</option>
              <option value="unknown">unknown</option>
            </select>
          </div>
        );

      case 'literal':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              value={String(node.value)}
              onChange={e => {
                let v: string | number | boolean = e.target.value;
                if (v === 'true') v = true;
                else if (v === 'false') v = false;
                else if (!isNaN(Number(v)) && v !== '') v = Number(v);
                onNodeUpdate(node.id, cur => ({ ...cur, value: v } as TypeNode));
              }}
              style={{ ...scratchInput, width: '80px' }}
            />
          </div>
        );

      case 'object':
        return (
          <div>
            {node.props.map((prop, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <input
                  value={prop.key}
                  onChange={e => onNodeUpdate(node.id, cur => {
                    if (cur.kind !== 'object') return cur;
                    const props = [...cur.props];
                    props[i] = { ...props[i], key: e.target.value };
                    return { ...cur, props };
                  })}
                  style={{ ...scratchInput, width: '72px' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!prop.optional}
                    onChange={e => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'object') return cur;
                      const props = [...cur.props];
                      props[i] = { ...props[i], optional: e.target.checked };
                      return { ...cur, props };
                    })}
                    style={{ width: '12px', height: '12px' }}
                  />
                  <span style={{ ...scratchLabel, fontSize: '10px' }}>?</span>
                </label>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700 }}>:</span>
                <Slot
                  {...makeSlotProps(
                    { kind: 'list', parentId: node.id, slot: 'props', index: i },
                    prop.value,
                    undefined,
                    () => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'object') return cur;
                      return { ...cur, props: cur.props.filter((_, j) => j !== i) };
                    })
                  )}
                />
              </div>
            ))}
            <button
              onClick={() => onNodeUpdate(node.id, cur => {
                if (cur.kind !== 'object') return cur;
                return { ...cur, props: [...cur.props, { key: 'key', value: { id: newId(), kind: 'primitive', name: 'string' } }] };
              })}
              style={{ ...scratchInput, cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#f59e0b', background: 'rgba(255,255,255,0.9)', padding: '2px 10px' }}
            >
              + プロパティ追加
            </button>
          </div>
        );

      case 'union':
      case 'intersection': {
        const sep = node.kind === 'union' ? '|' : '&';
        const members = node.kind === 'union' ? node.members : node.members;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {members.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i > 0 && <span style={{ color: 'white', fontWeight: 900, fontSize: '14px', fontFamily: 'Fira Code, monospace' }}>{sep}</span>}
                <Slot
                  {...makeSlotProps(
                    { kind: 'list', parentId: node.id, slot: 'members', index: i },
                    m,
                    undefined,
                    () => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'union' && cur.kind !== 'intersection') return cur;
                      return { ...cur, members: cur.members.filter((_, j) => j !== i) };
                    })
                  )}
                />
              </div>
            ))}
            <Slot
              {...makeSlotProps(
                { kind: 'listAppend', parentId: node.id, slot: 'members' },
                null,
                undefined,
                undefined
              )}
            />
          </div>
        );
      }

      case 'tuple':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace' }}>[</span>
            {node.elements.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>,</span>}
                <Slot
                  {...makeSlotProps(
                    { kind: 'list', parentId: node.id, slot: 'elements', index: i },
                    e,
                    undefined,
                    () => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'tuple') return cur;
                      return { ...cur, elements: cur.elements.filter((_, j) => j !== i) };
                    })
                  )}
                />
              </div>
            ))}
            <Slot {...makeSlotProps({ kind: 'listAppend', parentId: node.id, slot: 'elements' }, null)} />
            <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace' }}>]</span>
          </div>
        );

      case 'array':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Slot
              {...makeSlotProps(
                { kind: 'single', parentId: node.id, slot: 'element' },
                node.element,
                '要素',
                () => onNodeUpdate(node.id, cur => ({ ...cur, element: null } as unknown as TypeNode))
              )}
            />
            <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace', fontSize: '13px' }}>[ ]</span>
          </div>
        );

      case 'keyof':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={scratchLabel}>対象</span>
            <Slot
              {...makeSlotProps(
                { kind: 'single', parentId: node.id, slot: 'target' },
                node.target,
                undefined,
                () => onNodeUpdate(node.id, cur => ({ ...cur, target: null } as unknown as TypeNode))
              )}
            />
          </div>
        );

      case 'indexedAccess':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'target' }, node.target, '対象')} />
            <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace' }}>[</span>
            <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'key' }, node.key, 'キー')} />
            <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace' }}>]</span>
          </div>
        );

      case 'mappedType':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={scratchLabel}>キー集合</span>
              <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'keys' }, node.keys)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={scratchLabel}>元のobject</span>
              <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'source' }, node.source)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={scratchLabel}>変換</span>
              <select
                value={node.transform}
                onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, transform: e.target.value } as TypeNode))}
                style={scratchSelect}
              >
                <option value="keep">そのまま</option>
                <option value="array">配列化</option>
                <option value="optional">optional化</option>
              </select>
            </div>
          </div>
        );

      case 'conditional': {
        const extendsInferNames = collectInferNamesInExtends(node.extends);
        const allInferNames = [...inferNames, ...extendsInferNames];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'check' }, node.check, 'check')} />
              <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace', fontSize: '12px' }}>extends</span>
              <Slot {...makeSlotProps(
                { kind: 'single', parentId: node.id, slot: 'extends' },
                node.extends,
                'extends',
                undefined,
                { insideExtends: true }
              )} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace' }}>?</span>
              <Slot {...makeSlotProps(
                { kind: 'single', parentId: node.id, slot: 'trueBranch' },
                node.trueBranch,
                'true',
                undefined,
                { inferNamesOverride: allInferNames }
              )} />
              <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Fira Code, monospace' }}>:</span>
              <Slot {...makeSlotProps(
                { kind: 'single', parentId: node.id, slot: 'falseBranch' },
                node.falseBranch,
                'false',
                undefined,
                { inferNamesOverride: allInferNames }
              )} />
            </div>
          </div>
        );
      }

      case 'infer':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {insideExtends ? (
              <input
                value={node.name}
                onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, name: e.target.value } as TypeNode))}
                style={{ ...scratchInput, width: '56px' }}
                placeholder="R"
              />
            ) : (
              <select
                value={node.name}
                onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, name: e.target.value } as TypeNode))}
                style={scratchSelect}
              >
                {inferNames.length === 0 && <option value={node.name}>{node.name}</option>}
                {inferNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        );

      case 'templateLiteral':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            <span style={{ color: 'white', fontFamily: 'Fira Code, monospace', fontWeight: 700 }}>`</span>
            {node.parts.map((part, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {typeof part === 'string' ? (
                  <input
                    value={part}
                    onChange={e => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'templateLiteral') return cur;
                      const parts = [...cur.parts];
                      parts[i] = e.target.value;
                      return { ...cur, parts };
                    })}
                    style={{ ...scratchInput, width: '60px' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ color: 'white', fontFamily: 'Fira Code, monospace', fontSize: '12px' }}>{'${'}</span>
                    <Slot
                      {...makeSlotProps(
                        { kind: 'list', parentId: node.id, slot: 'parts', index: i },
                        part,
                        undefined,
                        () => onNodeUpdate(node.id, cur => {
                          if (cur.kind !== 'templateLiteral') return cur;
                          return { ...cur, parts: cur.parts.filter((_, j) => j !== i) };
                        })
                      )}
                    />
                    <span style={{ color: 'white', fontFamily: 'Fira Code, monospace', fontSize: '12px' }}>{'}'}</span>
                  </div>
                )}
              </div>
            ))}
            <span style={{ color: 'white', fontFamily: 'Fira Code, monospace', fontWeight: 700 }}>`</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => onNodeUpdate(node.id, cur => {
                  if (cur.kind !== 'templateLiteral') return cur;
                  return { ...cur, parts: [...cur.parts, ''] };
                })}
                style={{ ...scratchInput, cursor: 'pointer', fontSize: '11px', color: '#db2777', fontWeight: 700 }}
              >
                +文字
              </button>
              <button
                onClick={() => onNodeUpdate(node.id, cur => {
                  if (cur.kind !== 'templateLiteral') return cur;
                  return { ...cur, parts: [...cur.parts, { id: newId(), kind: 'primitive', name: 'string' }] };
                })}
                style={{ ...scratchInput, cursor: 'pointer', fontSize: '11px', color: '#db2777', fontWeight: 700 }}
              >
                +型
              </button>
            </div>
          </div>
        );

      case 'ref':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'white', fontFamily: 'Fira Code, monospace', fontWeight: 700, fontSize: '13px' }}>{node.name}</span>
          </div>
        );

      default:
        return <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>unknown</div>;
    }
  }

  // Leaf nodes rendered inline (no body section needed)
  const isLeaf = ['primitive', 'literal', 'ref', 'infer'].includes(node.kind);

  return (
    <div
      ref={setDragRef}
      style={{
        backgroundColor: config.bg,
        borderRadius: '10px',
        marginBottom: '6px',
        boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        opacity: isDragging ? 0.45 : 1,
        transition: 'opacity 0.1s',
      }}
    >
      {/* Header strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isLeaf ? '6px 10px' : '7px 10px 6px',
        gap: '8px',
      }}>
        {/* Kind label + content for leaf nodes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{
            color: 'rgba(255,255,255,0.95)',
            fontSize: '11px',
            fontWeight: 800,
            fontFamily: 'Nunito, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}>
            {config.label}
          </span>
          {isLeaf && renderContent()}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          {!isRoot && (
            <button
              {...listeners}
              {...attributes}
              style={{ ...iconBtn, cursor: 'grab', fontSize: '16px', touchAction: 'none' }}
              title="ドラッグして移動"
            >
              ⠿
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              style={{ ...iconBtn, fontSize: '16px' }}
              title="削除"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Body for non-leaf nodes */}
      {!isLeaf && (
        <div style={{
          background: 'rgba(0,0,0,0.14)',
          padding: '8px 12px 10px',
          borderTop: '1px solid rgba(255,255,255,0.12)',
        }}>
          {renderContent()}
        </div>
      )}

      {/* Result / Error footer */}
      {!insideExtends && result && (
        result.errors.length > 0 ? (
          <div className="relative group" style={{
            background: 'rgba(239,68,68,0.25)',
            borderTop: '1px solid rgba(239,68,68,0.3)',
            padding: '4px 12px',
          }}>
            <div style={{
              fontFamily: 'Fira Code, monospace',
              fontSize: '11px',
              color: '#fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflow: 'hidden',
            }}>
              <span style={{ fontWeight: 700, color: '#fca5a5', flexShrink: 0 }}>!</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {result.errors[0].split('\n')[0]}
              </span>
            </div>
            <div style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              zIndex: 50,
              width: '320px',
              maxHeight: '160px',
              overflowY: 'auto',
              background: '#1e293b',
              color: '#fca5a5',
              fontFamily: 'Fira Code, monospace',
              fontSize: '11px',
              borderRadius: '8px',
              padding: '10px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              pointerEvents: 'none',
            }} className="invisible group-hover:visible">
              {result.errors.join('\n\n')}
            </div>
          </div>
        ) : (
          <div className="relative group" style={{
            background: 'rgba(0,0,0,0.2)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '4px 12px',
          }}>
            <div style={{
              fontFamily: 'Fira Code, monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflow: 'hidden',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>→</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {result.displayString}
              </span>
            </div>
            {result.displayString.length > 35 && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '100%',
                zIndex: 50,
                width: '320px',
                maxHeight: '160px',
                overflowY: 'auto',
                background: '#1e293b',
                color: '#86efac',
                fontFamily: 'Fira Code, monospace',
                fontSize: '11px',
                borderRadius: '8px',
                padding: '10px 12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                pointerEvents: 'none',
              }} className="invisible group-hover:visible">
                {result.displayString}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
